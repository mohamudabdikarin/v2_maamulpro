import { useEffect, useState } from 'react';
import { api, Session, sessionStore } from '../../lib/api';

let exchange: Promise<Session> | null = null;

const ImpersonationPage = () => {
    const [error, setError] = useState('');

    useEffect(() => {
        const token = decodeURIComponent(window.location.hash.slice(1));
        window.history.replaceState(null, '', window.location.pathname);
        if (!token) {
            setError('The impersonation link is missing or expired.');
            return;
        }
        exchange ||= api<Session>('/api/auth/impersonation/exchange', {
            method: 'POST',
            body: JSON.stringify({ token }),
            silent: true,
        });
        exchange
            .then((session) => {
                sessionStore.set(session, false);
                window.location.replace('/app/dashboard');
            })
            .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to enter the company workspace.'));
    }, []);

    return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-black">
        <div className="panel max-w-md text-center">
            <img className="mx-auto h-14 w-14" src="/assets/images/logo.svg" alt="MaamulPro" />
            <h1 className="mt-5 text-xl font-extrabold">Entering company workspace</h1>
            <p className={`mt-2 text-sm ${error ? 'text-danger' : 'text-white-dark'}`}>
                {error || 'Creating the secure support session...'}
            </p>
        </div>
    </main>;
};

export default ImpersonationPage;
