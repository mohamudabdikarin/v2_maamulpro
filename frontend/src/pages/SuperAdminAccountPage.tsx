import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { ErrorAlert, Field, LoadingState, Modal, PageHeader, PasswordInput, shortDate } from '../components/maamulpro/PageKit';
import { api, sessionStore } from '../lib/api';

const SuperAdminAccountPage = () => {
    const navigate = useNavigate();
    const [account, setAccount] = useState<any>(null);
    const [email, setEmail] = useState({ email: '', currentPassword: '', verificationCode: '' });
    const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [verificationOpen, setVerificationOpen] = useState(false);
    const [working, setWorking] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);

    const load = () => api<any>('/api/superadmin/account')
        .then((row) => {
            setAccount(row);
            setEmail((current) => ({ ...current, email: row.email }));
        })
        .catch((reason) => setError(reason.message));

    useEffect(() => { load(); }, []);

    const requestEmailVerification = async (event: FormEvent) => {
        event.preventDefault();
        setWorking('email');
        setError('');
        setMessage('');
        try {
            await api('/api/superadmin/account/email-verification/send', {
                method: 'POST',
                body: JSON.stringify({ email: email.email, currentPassword: email.currentPassword }),
            });
            setEmail((current) => ({ ...current, verificationCode: '' }));
            setVerificationOpen(true);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to send verification code.');
        } finally {
            setWorking('');
        }
    };

    const confirmEmail = async () => {
        setWorking('verify-email');
        setError('');
        try {
            const row = await api<any>('/api/superadmin/account/email', {
                method: 'PATCH',
                body: JSON.stringify(email),
            });
            const session = sessionStore.get();
            if (session) sessionStore.set({ ...session, user: { ...session.user, email: row.email } });
            setEmail({ email: row.email, currentPassword: '', verificationCode: '' });
            setVerificationOpen(false);
            setMessage('Email address updated successfully.');
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Email update failed.');
        } finally {
            setWorking('');
        }
    };

    const updatePassword = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setMessage('');
        if (password.newPassword !== password.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setWorking('password');
        try {
            await api('/api/superadmin/account/password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword: password.currentPassword, newPassword: password.newPassword }),
            });
            setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
            sessionStore.clear();
            navigate('/superadmin/login', {
                replace: true,
                state: { message: 'Password updated. Sign in again on this device.' },
            });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Password update failed.');
        } finally {
            setWorking('');
        }
    };

    return <AppShell>
        <PageHeader eyebrow="Platform security" title="Administrator account" description="Manage the internal administrator sign-in identity and password." />
        {error && <ErrorAlert message={error} />}
        {message && <div className="mb-5 rounded-md bg-success-light p-4 text-success">{message}</div>}
        {!account ? <div className="panel"><LoadingState /></div> : <div className="grid gap-6 xl:grid-cols-2">
            <section className="panel">
                <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="text-primary" size={20} /> Account profile</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div><dt className="text-xs uppercase text-white-dark">Name</dt><dd className="font-bold">{account.name}</dd></div>
                    <div><dt className="text-xs uppercase text-white-dark">Role</dt><dd className="font-bold">Super Admin</dd></div>
                    <div><dt className="text-xs uppercase text-white-dark">Email</dt><dd>{account.email}</dd></div>
                    <div><dt className="text-xs uppercase text-white-dark">Created</dt><dd>{shortDate(account.createdAt)}</dd></div>
                    <div><dt className="text-xs uppercase text-white-dark">Last sign in</dt><dd>{shortDate(account.lastLoginAt)}</dd></div>
                    <div><dt className="text-xs uppercase text-white-dark">Password changed</dt><dd>{shortDate(account.passwordResetAt)}</dd></div>
                </dl>
            </section>

            <form className="panel space-y-4" onSubmit={requestEmailVerification}>
                <h2 className="text-lg font-bold">Change email address</h2>
                <p className="text-sm text-white-dark">The new address must be verified before it becomes your login identity.</p>
                <Field label="New email" required><input className="form-input mt-1" type="email" required value={email.email} onChange={(event) => setEmail({ ...email, email: event.target.value })} /></Field>
                <Field label="Current password" required><PasswordInput autoComplete="current-password" className="form-input mt-1" required value={email.currentPassword} onChange={(event) => setEmail({ ...email, currentPassword: event.target.value })} /></Field>
                <button className="btn btn-primary" disabled={working === 'email'}>{working === 'email' ? 'Sending…' : 'Verify new email'}</button>
            </form>

            <form className="panel space-y-4 xl:col-span-2" onSubmit={updatePassword}>
                <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Change password</h2><p className="mt-1 text-sm text-white-dark">Minimum 6 characters.</p></div><button className="text-white-dark hover:text-primary" type="button" onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Current password" required><input className="form-input mt-1" type={showPasswords ? 'text' : 'password'} required value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></Field>
                    <Field label="New password" required><input className="form-input mt-1" type={showPasswords ? 'text' : 'password'} minLength={6} required value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /></Field>
                    <Field label="Confirm password" required><input className="form-input mt-1" type={showPasswords ? 'text' : 'password'} minLength={6} required value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} /></Field>
                </div>
                <button className="btn btn-primary" disabled={working === 'password'}>{working === 'password' ? 'Updating…' : 'Update password'}</button>
            </form>
        </div>}

        <Modal title="Verify new email" open={verificationOpen} onClose={() => setVerificationOpen(false)}>
            <p className="text-sm text-white-dark">Enter the 6-digit code sent to <strong>{email.email}</strong>.</p>
            <input className="form-input mx-auto mt-5 max-w-xs text-center text-xl font-bold tracking-[0.45em]" inputMode="numeric" maxLength={6} value={email.verificationCode} onChange={(event) => setEmail({ ...email, verificationCode: event.target.value.replace(/\D/g, '').slice(0, 6) })} />
            <div className="mt-5 flex justify-end gap-2"><button className="btn btn-outline-dark" type="button" onClick={() => setVerificationOpen(false)}>Cancel</button><button className="btn btn-primary" type="button" disabled={working === 'verify-email' || email.verificationCode.length !== 6} onClick={confirmEmail}>{working === 'verify-email' ? 'Verifying…' : 'Verify & update'}</button></div>
        </Modal>
    </AppShell>;
};

export default SuperAdminAccountPage;
