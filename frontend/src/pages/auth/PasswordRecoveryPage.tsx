import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import IconLockDots from '../../components/Icon/IconLockDots';
import { api } from '../../lib/api';

const PasswordRecoveryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const superAdmin = location.pathname.startsWith('/superadmin');
    const [step, setStep] = useState<'request' | 'reset'>('request');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [previewCode, setPreviewCode] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const request = async (event: FormEvent) => {
        event.preventDefault(); setError('');
        try {
            const result = await api<{ accepted: boolean; previewCode?: string }>('/api/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) });
            setPreviewCode(result.previewCode || '');
            setMessage('If the address belongs to an active account, a reset code has been sent.');
            setStep('reset');
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to request reset'); }
    };
    const reset = async (event: FormEvent) => {
        event.preventDefault(); setError('');
        try {
            await api('/api/auth/password/reset', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) });
            navigate(superAdmin ? '/superadmin/login' : '/sign-in', { replace: true, state: { message: 'Password reset. Sign in with your new password.' } });
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to reset password'); }
    };

    return <div className="grid min-h-screen place-items-center bg-[#f6f8fb] p-6 dark:bg-[#060818]">
        <div className="panel w-full max-w-md p-8 shadow-xl">
            <div className="mb-7 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white"><IconLockDots /></span><div><h1 className="text-2xl font-extrabold">Password recovery</h1><p className="text-white-dark">Secure account reset</p></div></div>
            {message && <div className="mb-5 rounded-md bg-success-light p-3 text-success">{message}</div>}
            {previewCode && <div className="mb-5 rounded-md bg-info-light p-3 text-info">Development reset code: <strong>{previewCode}</strong></div>}
            {error && <div className="mb-5 rounded-md bg-danger-light p-3 text-danger">{error}</div>}
            {step === 'request' ? <form className="space-y-5" onSubmit={request}><div><label>Email address</label><input className="form-input mt-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><button className="btn btn-primary w-full">Send reset code</button></form>
                : <form className="space-y-5" onSubmit={reset}><div><label>Email address</label><input className="form-input mt-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><div><label>Six-digit code</label><input className="form-input mt-2" inputMode="numeric" minLength={6} maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></div><div><label>New password</label><input className="form-input mt-2" type="password" minLength={10} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div><button className="btn btn-primary w-full">Reset password</button><button type="button" className="btn btn-outline-dark w-full" onClick={() => setStep('request')}>Request another code</button></form>}
            <Link className="mt-6 block text-center text-primary hover:underline" to={superAdmin ? '/superadmin/login' : '/sign-in'}>Back to sign in</Link>
        </div>
    </div>;
};

export default PasswordRecoveryPage;
