import { Link, useSearchParams } from 'react-router-dom';

const LockedPage = () => {
    const [params] = useSearchParams();
    const reason = params.get('reason') || 'Your company account is currently unavailable.';
    return <div className="grid min-h-screen place-items-center bg-[#f6f8fb] p-4 dark:bg-[#060818]">
        <div className="panel w-full max-w-lg text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warning-light text-3xl text-warning">!</div>
            <h1 className="mt-5 text-2xl font-extrabold">Account access is locked</h1>
            <p className="mt-3 text-white-dark">{reason}</p>
            <p className="mt-3 text-sm text-white-dark">Contact your company administrator or MaamulPro support if you believe this is unexpected.</p>
            <Link to="/sign-in" className="btn btn-primary mt-6">Back to sign in</Link>
        </div>
    </div>;
};

export default LockedPage;
