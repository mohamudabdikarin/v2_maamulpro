import { FormEvent, useEffect, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { LoadingState, PageHeader } from '../components/maamulpro/PageKit';

type Settings = {
    companyName: string;
    logoUrl?: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    companyDescription: string;
    constructionEnabled: boolean;
    realEstateEnabled: boolean;
    materialManagementEnabled: boolean;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: string;
    entitlements?: { features: Record<string, boolean>; limits: Record<string, number> };
    usage?: Record<string, number>;
};
type Profile = { name: string; email: string; avatarUrl?: string; language: string; role: string };

const SettingsPage = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
    const [uploading, setUploading] = useState('');
    const [preferences, setPreferences] = useState(() => {
        try { return JSON.parse(localStorage.getItem('maamulpro.preferences') || '{"emailNotifications":true,"reportNotifications":true,"compactTables":false}'); } catch { return { emailNotifications: true, reportNotifications: true, compactTables: false }; }
    });

    useEffect(() => {
        Promise.all([api<Settings>('/api/settings'), api<Profile>('/api/settings/profile')])
            .then(([company, user]) => { setSettings(company); setProfile(user); })
            .catch((reason) => setError(reason.message));
    }, []);

    const uploadImage = async (file: File | undefined, folder: 'branding' | 'avatars', target: 'logoUrl' | 'avatarUrl') => {
        if (!file) return;
        setUploading(target); setError('');
        try {
            const data = new FormData();
            data.append('file', file);
            const result = await api<{ url: string }>(`/api/uploads/images?folder=${folder}`, { method: 'POST', body: data });
            if (target === 'logoUrl') setSettings((current) => current ? { ...current, logoUrl: result.url } : current);
            else setProfile((current) => current ? { ...current, avatarUrl: result.url } : current);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to upload image');
        } finally {
            setUploading('');
        }
    };

    const save = async (event: FormEvent, type: 'company' | 'profile' | 'password') => {
        event.preventDefault(); setMessage(''); setError('');
        try {
            if (type === 'company' && settings) {
                const { companyName, logoUrl, companyEmail, companyPhone, companyAddress, companyDescription } = settings;
                await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ companyName, logoUrl, companyEmail, companyPhone, companyAddress, companyDescription }) });
            } else if (type === 'profile' && profile) {
                await api('/api/settings/profile', { method: 'PATCH', body: JSON.stringify({ name: profile.name, email: profile.email, avatarUrl: profile.avatarUrl }) });
                await api('/api/settings/language', { method: 'PATCH', body: JSON.stringify({ language: profile.language }) });
            } else {
                await api('/api/settings/password', { method: 'PATCH', body: JSON.stringify(passwords) });
                setPasswords({ currentPassword: '', newPassword: '' });
            }
            setMessage('Changes saved successfully.');
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to save changes');
        }
    };
    const savePreferences = () => { localStorage.setItem('maamulpro.preferences', JSON.stringify(preferences)); setMessage('Preferences saved successfully.'); };

    return (
        <AppShell>
            <PageHeader eyebrow="Configuration" title="Company & Account Settings" description="Branding, company information, profile, language, appearance, notifications and security." />
            <div className="mb-6 flex gap-2 overflow-x-auto border-b border-white-light pb-3 dark:border-[#191e3a]">{[['#company', 'Company'], ['#account', 'Account'], ['#preferences', 'Preferences'], ['#categories', 'Categories'], ['#billing', 'Billing']].map(([to, label]) => <a className="btn btn-sm btn-outline-primary shrink-0" href={to}>{label}</a>)}</div>
            {message && <div className="mt-5 rounded-md bg-success-light p-4 text-success">{message}</div>}
            {error && <div className="mt-5 rounded-md bg-danger-light p-4 text-danger">{error}</div>}
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <form id="company" className="panel space-y-4" onSubmit={(e) => save(e, 'company')}>
                    <h2 className="text-lg font-bold">Company profile</h2>
                    {!settings ? <LoadingState /> : <>
                        <div><label>Company logo</label><div className="mt-2 flex items-center gap-3">{settings.logoUrl && <img src={settings.logoUrl} className="h-20 w-20 rounded-lg border border-white-light object-contain p-1 dark:border-[#191e3a]" alt="Company logo" />}<input className="form-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading === 'logoUrl'} onChange={(e) => uploadImage(e.target.files?.[0], 'branding', 'logoUrl')} /></div>{uploading === 'logoUrl' && <p className="mt-1 text-xs text-primary">Uploading…</p>}</div>
                        {(['companyName', 'companyEmail', 'companyPhone', 'companyAddress'] as const).map((field) => <div key={field}><label>{field.replace(/([A-Z])/g, ' $1')}</label><input className="form-input mt-1" value={settings[field] || ''} onChange={(e) => setSettings({ ...settings, [field]: e.target.value })} /></div>)}
                        <div><label>Description</label><textarea className="form-textarea mt-1" value={settings.companyDescription || ''} onChange={(e) => setSettings({ ...settings, companyDescription: e.target.value })} /></div>
                        <div className="grid gap-2 sm:grid-cols-3">{(['constructionEnabled', 'realEstateEnabled', 'materialManagementEnabled'] as const).map((field) => <span className={`badge ${settings[field] ? 'bg-success' : 'bg-dark'} text-white`} key={field}>{field.replace('Enabled', '')}: {settings[field] ? 'Enabled' : 'Disabled'}</span>)}</div>
                        <button className="btn btn-primary">Save company settings</button>
                    </>}
                </form>
                <div className="space-y-6">
                    <form id="account" className="panel space-y-4" onSubmit={(e) => save(e, 'profile')}>
                        <h2 className="text-lg font-bold">My profile</h2>
                        {!profile ? <LoadingState /> : <>
                            <div><label>Profile photo</label><div className="mt-2 flex items-center gap-3">{profile.avatarUrl && <img src={profile.avatarUrl} className="h-20 w-20 rounded-full border border-white-light object-cover dark:border-[#191e3a]" alt="Profile" />}<input className="form-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading === 'avatarUrl'} onChange={(e) => uploadImage(e.target.files?.[0], 'avatars', 'avatarUrl')} /></div>{uploading === 'avatarUrl' && <p className="mt-1 text-xs text-primary">Uploading…</p>}</div>
                            <div><label>Name</label><input className="form-input mt-1" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
                            <div><label>Email</label><input className="form-input mt-1" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
                            <div><label>Language</label><select className="form-select mt-1" value={profile.language} onChange={(e) => setProfile({ ...profile, language: e.target.value })}><option value="en">English</option><option value="so">Somali</option></select></div>
                            <button className="btn btn-primary">Save profile</button>
                        </>}
                    </form>
                    <form className="panel space-y-4" onSubmit={(e) => save(e, 'password')}>
                        <h2 className="text-lg font-bold">Change password</h2>
                        <input className="form-input" type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
                        <input className="form-input" type="password" placeholder="New strong password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} minLength={12} required />
                        <button className="btn btn-danger">Update password</button>
                    </form>
                </div>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <div id="preferences" className="panel space-y-4"><h2 className="text-lg font-bold">Appearance & notifications</h2><p className="text-sm text-white-dark">Personal preferences are stored for this browser.</p>{([['emailNotifications', 'Account and security emails'], ['reportNotifications', 'Scheduled report notifications'], ['compactTables', 'Compact data tables']] as const).map(([key, label]) => <label className="flex items-center justify-between gap-3 rounded-md border border-white-light p-3 dark:border-[#191e3a]"><span>{label}</span><input className="form-checkbox" type="checkbox" checked={Boolean(preferences[key])} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} /></label>)}<button className="btn btn-primary w-full" onClick={savePreferences}>Save preferences</button></div>
                <div id="categories" className="panel"><h2 className="text-lg font-bold">Transaction categories</h2><p className="mt-2 text-sm text-white-dark">Manage the classifications available on income and expense forms.</p><Link className="btn btn-outline-primary mt-5" to="/app/financials/categories">Manage categories</Link></div>
                <div id="billing" className="panel"><h2 className="text-lg font-bold">Workspace subscription</h2><p className="mt-2 text-sm text-white-dark">Modules and capacity are enforced by your paid MaamulPro plan.</p>{settings && <div className="mt-4 space-y-2">{Object.entries(settings.entitlements?.features || {}).map(([key, enabled]) => <div className="flex justify-between rounded-md bg-gray-50 p-3 dark:bg-dark" key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><span className={`badge ${enabled ? 'bg-success' : 'bg-dark'} text-white`}>{enabled ? 'Enabled' : 'Not included'}</span></div>)}<h3 className="pt-3 font-bold">Capacity usage</h3>{Object.entries(settings.entitlements?.limits || {}).map(([key, limit]) => <div className="rounded-md bg-gray-50 p-3 dark:bg-dark" key={key}><div className="flex justify-between"><span>{key.replace(/([A-Z])/g, ' $1')}</span><strong>{settings.usage?.[key] || 0} / {Number(limit) === 0 ? 'Unlimited' : limit}</strong></div>{Number(limit) > 0 && <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-black"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, ((settings.usage?.[key] || 0) / Number(limit)) * 100)}%` }} /></div>}</div>)}</div>}</div>
            </div>
        </AppShell>
    );
};

export default SettingsPage;
