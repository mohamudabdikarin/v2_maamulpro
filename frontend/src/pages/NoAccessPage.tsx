import { Link, useLocation } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { sessionStore } from '../lib/api';

const LANDING_BY_PERMISSION: { permission: string; route: string }[] = [
    { permission: 'dashboard.executive.read', route: '/app/dashboard' },
    { permission: 'workspace.construction.read', route: '/app/construction/overview' },
    { permission: 'workspace.real_estate.read', route: '/app/real-estate/overview' },
    { permission: 'workspace.material_management.read', route: '/app/materials/overview' },
    { permission: 'financials.read', route: '/app/financials' },
    { permission: 'payroll.read', route: '/app/payroll' },
];

const NoAccessPage = () => {
    const location = useLocation();
    const session = sessionStore.get();
    const user = session?.user;
    const isOwner = user?.isSuperAdmin || (user && ['SUPER_ADMIN', 'COMPANY_OWNER'].includes(user.role));
    const granted = new Set(user?.permissions || []);
    const landing = isOwner
        ? '/app/dashboard'
        : LANDING_BY_PERMISSION.find((entry) => granted.has(entry.permission))?.route || '/app/settings';
    return <AppShell><div className="mx-auto max-w-xl py-16">
        <div className="panel text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger-light text-3xl text-danger">!</div>
            <h1 className="mt-5 text-2xl font-extrabold">Access restricted</h1>
            <p className="mt-2 text-white-dark">Your account does not have access to this workspace or action. Ask a company administrator to review your assigned role and permissions.</p>
            {(location.state as any)?.from && <p className="mt-3 rounded-md bg-gray-100 p-2 font-mono text-xs text-white-dark dark:bg-dark">{(location.state as any).from}</p>}
            <Link className="btn btn-primary mt-6" to={landing}>Return to your workspace</Link>
        </div>
    </div></AppShell>;
};

export default NoAccessPage;
