import { Link, useLocation } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';

const NoAccessPage = () => {
    const location = useLocation();
    return <AppShell><div className="mx-auto max-w-xl py-16">
        <div className="panel text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger-light text-3xl text-danger">!</div>
            <h1 className="mt-5 text-2xl font-extrabold">Access restricted</h1>
            <p className="mt-2 text-white-dark">Your account does not have access to this workspace or action. Ask a company administrator to review your assigned role and permissions.</p>
            {(location.state as any)?.from && <p className="mt-3 rounded-md bg-gray-100 p-2 font-mono text-xs text-white-dark dark:bg-dark">{(location.state as any).from}</p>}
            <Link className="btn btn-primary mt-6" to="/app/dashboard">Return to Executive Hub</Link>
        </div>
    </div></AppShell>;
};

export default NoAccessPage;
