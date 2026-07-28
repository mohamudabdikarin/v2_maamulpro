import { ReactNode, useEffect, useMemo, useState } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import AnimateHeight from 'react-animate-height';
import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { toggleSidebar } from '../../store/themeConfigSlice';
import { Session, sessionStore } from '../../lib/api';
import IconCaretDown from '../Icon/IconCaretDown';
import IconCaretsDown from '../Icon/IconCaretsDown';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMenuUsers from '../Icon/Menu/IconMenuUsers';
import IconMenuInvoice from '../Icon/Menu/IconMenuInvoice';
import IconMenuCharts from '../Icon/Menu/IconMenuCharts';
import IconMenuComponents from '../Icon/Menu/IconMenuComponents';
import IconMenuElements from '../Icon/Menu/IconMenuElements';
import IconMenuForms from '../Icon/Menu/IconMenuForms';
import IconMenuPages from '../Icon/Menu/IconMenuPages';

type Feature = 'construction' | 'realEstate' | 'materials' | 'payroll' | 'advancedReports';
type Item = { label: string; to: string; icon?: ReactNode; feature?: Feature };
type Group = { label: string; icon: ReactNode; items: Item[]; feature?: Feature };

const iconClass = 'group-hover:!text-primary shrink-0';

const companyGroups: Group[] = [
    { label: 'Executive hub', icon: <IconMenuDashboard className={iconClass} />, items: [{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Analytics', to: '/app/analytics' }] },
    { label: 'People & finance', icon: <IconMenuUsers className={iconClass} />, items: [{ label: 'Staff', to: '/app/staff' }, { label: 'Financials', to: '/app/financials' }, { label: 'Chart of accounts', to: '/app/financials/accounts' }, { label: 'Payroll', to: '/app/payroll', feature: 'payroll' }, { label: 'Payslips', to: '/app/payroll/payslips', feature: 'payroll' }] },
    { label: 'Construction', feature: 'construction', icon: <IconMenuComponents className={iconClass} />, items: [{ label: 'Overview', to: '/app/construction/overview' }, { label: 'Projects', to: '/app/construction/projects' }, { label: 'Tasks', to: '/app/construction/tasks' }, { label: 'Expenses', to: '/app/construction/expenses' }, { label: 'Manpower', to: '/app/construction/manpower' }, { label: 'Inventory', to: '/app/construction/inventory' }, { label: 'Contracts', to: '/app/construction/contracts' }] },
    { label: 'Real estate', feature: 'realEstate', icon: <IconMenuElements className={iconClass} />, items: [{ label: 'Overview', to: '/app/real-estate/overview' }, { label: 'Properties', to: '/app/real-estate/properties' }, { label: 'Clients', to: '/app/real-estate/clients' }, { label: 'Deals', to: '/app/real-estate/deals' }, { label: 'Rentals', to: '/app/real-estate/rentals' }, { label: 'Rental contracts', to: '/app/real-estate/rental-contracts' }] },
    { label: 'Materials', feature: 'materials', icon: <IconMenuInvoice className={iconClass} />, items: [{ label: 'Overview', to: '/app/materials/overview' }, { label: 'Inventory', to: '/app/materials/inventory' }, { label: 'Suppliers', to: '/app/materials/suppliers' }, { label: 'Purchases', to: '/app/materials/purchases' }, { label: 'Sales', to: '/app/materials/sales' }, { label: 'Transportation', to: '/app/materials/transportation' }] },
    { label: 'Governance', icon: <IconMenuCharts className={iconClass} />, items: [{ label: 'Reports', to: '/app/reports', feature: 'advancedReports' }, { label: 'Report schedules', to: '/app/report-schedules', feature: 'advancedReports' }, { label: 'Audit logs', to: '/app/audits' }, { label: 'Roles & permissions', to: '/app/roles' }, { label: 'Settings', to: '/app/settings' }] },
];

const platformGroups: Group[] = [
    { label: 'Platform', icon: <IconMenuDashboard className={iconClass} />, items: [{ label: 'Dashboard', to: '/superadmin/dashboard' }, { label: 'Companies', to: '/superadmin/companies' }, { label: 'Plans', to: '/superadmin/plans' }, { label: 'Subscriptions & billing', to: '/superadmin/billing' }] },
    { label: 'Administration', icon: <IconMenuForms className={iconClass} />, items: [{ label: 'My account', to: '/superadmin/account' }] },
];

const platformItems: Item[] = [
    { label: 'Dashboard', to: '/superadmin/dashboard', icon: <IconMenuDashboard className={iconClass} /> },
    { label: 'Companies', to: '/superadmin/companies', icon: <IconMenuUsers className={iconClass} /> },
    { label: 'Plans', to: '/superadmin/plans', icon: <IconMenuInvoice className={iconClass} /> },
    { label: 'Subscriptions & billing', to: '/superadmin/billing', icon: <IconMenuCharts className={iconClass} /> },
    { label: 'My account', to: '/superadmin/account', icon: <IconMenuForms className={iconClass} /> },
];

const Sidebar = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const [session, setSession] = useState<Session | null>(() => sessionStore.get());
    useEffect(() => {
        const update = (event: Event) => setSession((event as CustomEvent<Session | null>).detail);
        window.addEventListener('maamulpro:session', update);
        return () => window.removeEventListener('maamulpro:session', update);
    }, []);
    const isPlatform = Boolean(session?.user.isSuperAdmin);
    const groups = useMemo(() => {
        if (isPlatform) return platformGroups;
        const features = session?.user.entitlements?.features;
        return companyGroups
            .filter((group) => !group.feature || Boolean(features?.[group.feature]))
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => !item.feature || Boolean(features?.[item.feature])),
            }))
            .filter((group) => group.items.length);
    }, [isPlatform, session]);
    const activeGroup = groups.find((group) => group.items.some((item) => location.pathname.startsWith(item.to)))?.label || '';
    const [openGroup, setOpenGroup] = useState(activeGroup);

    useEffect(() => {
        setOpenGroup(activeGroup);
        if (window.innerWidth < 1024 && themeConfig.sidebar) dispatch(toggleSidebar());
    }, [activeGroup, location.pathname]);

    const home = session?.user.isSuperAdmin ? '/superadmin/dashboard' : '/app/dashboard';
    const collapsed = themeConfig.sidebar === true || themeConfig.sidebar === 'true';

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav className={'sidebar fixed min-h-screen h-full top-0 bottom-0 z-50 shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300 ' + (collapsed ? 'w-[72px]' : 'w-[260px]') + ' ' + (semidark ? 'text-white-dark' : '')}>
                <div className="h-full bg-white dark:bg-black">
                    <div className="flex items-center justify-between px-4 py-3">
                        <NavLink className="main-logo flex shrink-0 items-center" to={home}>
                            <img alt="MaamulPro" className="ml-[5px] w-8 flex-none" src="/assets/images/logo.svg" />
                            {!collapsed && <span className="ml-1.5 text-2xl font-semibold align-middle dark:text-white-light">MaamulPro</span>}
                        </NavLink>
                        <button className="collapse-icon flex h-8 w-8 rounded-full transition duration-300 hover:bg-gray-500/10 dark:text-white-light dark:hover:bg-dark-light/10" onClick={() => dispatch(toggleSidebar())} type="button">
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="relative h-[calc(100vh-80px)]">
                        <ul className={`relative space-y-0.5 py-0 font-semibold ${collapsed ? 'p-2' : 'p-4'}`}>
                            {isPlatform ? platformItems.map((item) => <li className="menu nav-item" key={item.to}><NavLink className="nav-link group" to={item.to} title={collapsed ? item.label : undefined}><div className="flex items-center">{item.icon}{!collapsed && <span className="pl-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{item.label}</span>}</div></NavLink></li>) : groups.map((group) => {
                                const expanded = openGroup === group.label;
                                return (
                                    <li className="menu nav-item" key={group.label}>
                                        <button className={'nav-link group w-full ' + (expanded ? 'active' : '')} onClick={() => setOpenGroup(expanded ? '' : group.label)} type="button">
                                            <div className="flex items-center">
                                                {group.icon}
                                                {!collapsed && <span className="pl-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{group.label}</span>}
                                            </div>
                                            <div className={expanded ? '' : '-rotate-90'}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={250} height={expanded && !collapsed ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                {group.items.map((item) => <li key={item.to}><NavLink end={item.to === home} to={item.to}>{item.label}</NavLink></li>)}
                                            </ul>
                                        </AnimateHeight>
                                    </li>
                                );
                            })}
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
