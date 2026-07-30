import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { toggleSidebar, toggleTheme } from '../../store/themeConfigSlice';
import { api, sessionStore } from '../../lib/api';
import Dropdown from '../Dropdown';
import IconBellBing from '../Icon/IconBellBing';
import IconMenu from '../Icon/IconMenu';
import IconMoon from '../Icon/IconMoon';
import IconSun from '../Icon/IconSun';
import IconUser from '../Icon/IconUser';
import IconLogout from '../Icon/IconLogout';
import IconLockDots from '../Icon/IconLockDots';

type PlatformNotification = { id: string; title: string; details: string; createdAt: string; category: string; companyId?: string };

const Header = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const session = sessionStore.get();
    const isSuperAdmin = Boolean(session?.user.isSuperAdmin);
    const [notifications, setNotifications] = useState<PlatformNotification[]>([]);

    useEffect(() => {
        if (!isSuperAdmin) return;
        let active = true;
        const loadNotifications = () => {
            api<{ notifications: PlatformNotification[] }>('/api/superadmin/notifications')
                .then((result) => { if (active) setNotifications(result.notifications); })
                .catch(() => { if (active) setNotifications([]); });
        };
        loadNotifications();
        window.addEventListener('maamulpro:platform-notifications', loadNotifications);
        return () => {
            active = false;
            window.removeEventListener('maamulpro:platform-notifications', loadNotifications);
        };
    }, [isSuperAdmin]);

    const logout = async () => {
        try {
            await api('/api/auth/logout', { method: 'POST' });
        } finally {
            sessionStore.clear();
            navigate(isSuperAdmin ? '/superadmin/login' : '/', { replace: true });
        }
    };
    const accountPath = isSuperAdmin ? '/superadmin/account' : '/app/settings';

    return (
        <header className="z-40">
            <div className="shadow-sm">
                <div className="relative flex w-full items-center bg-white px-5 py-2.5 dark:bg-[#121c2c]">
                    <button type="button" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-dark-light/10" onClick={() => dispatch(toggleSidebar())} aria-label="Toggle navigation">
                        <IconMenu />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-light/10" onClick={() => dispatch(toggleTheme(themeConfig.theme === 'light' ? 'dark' : 'light'))} aria-label="Toggle color theme">
                            {themeConfig.theme === 'light' ? <IconMoon /> : <IconSun />}
                        </button>
                        {isSuperAdmin && <Dropdown
                            placement="bottom-end"
                            btnClassName="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-light/10"
                            button={<><IconBellBing />{notifications.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />}</>}
                        >
                            <div className="mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black/5 dark:bg-[#1b2e4b]">
                                <div className="flex items-center justify-between border-b border-white-light px-4 py-3 dark:border-[#191e3a]"><p className="font-bold">Platform notifications</p><Link className="text-xs font-semibold text-primary" to="/superadmin/dashboard">Dashboard</Link></div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length ? notifications.map((item) => <Link className="block border-b border-white-light px-4 py-3 last:border-0 hover:bg-gray-50 dark:border-[#191e3a] dark:hover:bg-[#152136]" key={item.id} to={item.companyId ? `/superadmin/companies/${item.companyId}` : '/superadmin/dashboard'}>
                                        <p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-white-dark">{item.details}</p><time className="mt-1 block text-[11px] text-white-dark">{new Date(item.createdAt).toLocaleString()}</time>
                                    </Link>) : <p className="p-6 text-center text-sm text-white-dark">No platform notifications.</p>}
                                </div>
                            </div>
                        </Dropdown>}
                        <Dropdown
                            placement="bottom-end"
                            btnClassName="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-gray-100 dark:hover:bg-dark-light/10"
                            button={<><span className="grid h-8 w-8 place-items-center rounded-full bg-primary-light font-bold text-primary">{(session?.user.name || session?.user.email || 'A').charAt(0).toUpperCase()}</span><span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{session?.user.name || session?.user.email}</span></>}
                        >
                            <div className="mt-2 w-56 rounded-md bg-white p-2 shadow-lg ring-1 ring-black/5 dark:bg-[#1b2e4b]">
                                <div className="border-b border-white-light px-3 py-2 dark:border-[#191e3a]"><p className="font-semibold">{session?.user.name || 'Administrator'}</p><p className="truncate text-xs text-white-dark">{session?.user.email}</p></div>
                                <Link className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#152136]" to={`${accountPath}#profile`}><IconUser className="h-4 w-4" />My Profile</Link>
                                <Link className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#152136]" to={`${accountPath}#settings`}><IconUser className="h-4 w-4" />Account Settings</Link>
                                <Link className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#152136]" to={`${accountPath}#password`}><IconLockDots className="h-4 w-4" />Change Password</Link>
                                <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-danger hover:bg-danger-light" onClick={logout} type="button"><IconLogout className="h-4 w-4" />Logout</button>
                            </div>
                        </Dropdown>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
