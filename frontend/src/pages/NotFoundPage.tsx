import { Link } from 'react-router-dom';
import { sessionStore } from '../lib/api';

const NotFoundPage = () => {
    const session = sessionStore.get();
    const home = session?.user.isSuperAdmin ? '/superadmin/dashboard' : session ? '/app/dashboard' : '/sign-in';
    return <div className="grid min-h-screen place-items-center bg-[#f6f8fb] p-6 dark:bg-[#060818]">
        <div className="panel w-full max-w-xl p-10 text-center shadow-xl">
            <p className="text-7xl font-black text-primary">404</p>
            <h1 className="mt-5 text-2xl font-extrabold">Page not found</h1>
            <p className="mx-auto mt-3 max-w-md text-white-dark">The requested MaamulPro page does not exist or its address has changed.</p>
            <Link className="btn btn-primary mx-auto mt-7 w-fit" to={home}>Return to MaamulPro</Link>
        </div>
    </div>;
};

export default NotFoundPage;
