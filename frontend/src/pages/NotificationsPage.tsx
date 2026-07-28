import { useEffect, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { api } from '../lib/api';

type Notification = { id: string; action: string; entity: string; details?: string; createdAt: string; actorName: string; isUnread: boolean };

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [error, setError] = useState('');
    const load = () => api<{ notifications: Notification[] }>('/api/settings/notifications').then((result) => setNotifications(result.notifications)).catch((reason) => setError(reason.message));
    useEffect(() => { load(); }, []);
    const markRead = async () => {
        try { await api('/api/settings/notifications/read', { method: 'POST' }); await load(); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update notifications'); }
    };
    return <AppShell>
        <div className="mb-6 flex items-end justify-between"><div><h1 className="text-2xl font-extrabold">Notifications</h1><p className="mt-1 text-white-dark">Recent operational and security activity across your company.</p></div><button className="btn btn-outline-primary" onClick={markRead}>Mark all read</button></div>
        {error && <div className="mb-5 rounded-md bg-danger-light p-4 text-danger">{error}</div>}
        <div className="panel divide-y divide-white-light p-0 dark:divide-[#191e3a]">{notifications.map((item) => <div className={`flex gap-4 p-5 ${item.isUnread ? 'bg-primary-light/50' : ''}`} key={item.id}><span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.isUnread ? 'bg-primary' : 'bg-white-dark/40'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.action} · {item.entity.replace(/_/g, ' ')}</p><time className="text-xs text-white-dark">{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-1 text-sm text-white-dark">{item.details || 'Activity recorded'} · {item.actorName}</p></div></div>)}{!notifications.length && <div className="p-10 text-center text-white-dark">No notifications yet.</div>}</div>
    </AppShell>;
};

export default NotificationsPage;
