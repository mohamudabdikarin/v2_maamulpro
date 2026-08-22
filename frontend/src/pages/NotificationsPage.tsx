import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';

type OperationalAlert = { id: string; type: string; severity: 'WARNING' | 'CRITICAL'; title: string; details?: string; targetPath?: string; activeAt: string; escalatedAt?: string; isUnread: boolean };
type ActivityNotification = { id: string; action: string; entity: string; details?: string; createdAt: string; actorName: string; isUnread: boolean };
type NotificationFeed = { alerts: OperationalAlert[]; activity: ActivityNotification[]; unreadCount: number };

const NotificationsPage = () => {
    const [feed, setFeed] = useState<NotificationFeed>({ alerts: [], activity: [], unreadCount: 0 });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const load = async () => {
        try { setError(''); setFeed(await api<NotificationFeed>('/api/settings/notifications')); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load notifications'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);
    const markRead = async () => {
        try { await api('/api/settings/notifications/read', { method: 'POST' }); window.dispatchEvent(new Event('maamulpro:tenant-notifications')); await load(); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update notifications'); }
    };
    const updateAlert = async (id: string, action: 'read' | 'dismiss') => {
        try { await api(`/api/settings/notifications/${id}/${action}`, { method: 'POST' }); window.dispatchEvent(new Event('maamulpro:tenant-notifications')); await load(); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update alert'); }
    };
    return <AppShell>
        <div className="mb-6 flex items-end justify-between gap-4"><div><h1 className="text-2xl font-extrabold">Notifications</h1><p className="mt-1 text-white-dark">Operational alerts and recent activity across your company.</p></div>{feed.unreadCount > 0 && <button className="btn btn-outline-primary" onClick={markRead}>Mark all read</button>}</div>
        {error && <ErrorAlert message={error} onRetry={load} />}
        {loading ? <div className="panel"><LoadingState label="Loading notifications…" /></div> : <div className="space-y-6">
            <section className="panel overflow-hidden p-0"><div className="border-b border-white-light px-5 py-4 dark:border-[#191e3a]"><h2 className="font-bold">Operational alerts</h2><p className="mt-1 text-sm text-white-dark">Items that need attention before they become a larger issue.</p></div>{feed.alerts.length ? <div className="divide-y divide-white-light dark:divide-[#191e3a]">{feed.alerts.map((alert) => <div className={`p-5 ${alert.isUnread ? 'bg-primary-light/40' : ''}`} key={alert.id}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`badge ${alert.severity === 'CRITICAL' ? 'bg-danger' : 'bg-warning'}`}>{alert.severity}</span><strong>{alert.title}</strong></div><time className="text-xs text-white-dark">{new Date(alert.activeAt).toLocaleString()}</time></div>{alert.details && <p className="mt-2 text-sm text-white-dark">{alert.details}</p>}<div className="mt-3 flex gap-2">{alert.targetPath && <Link className="btn btn-sm btn-outline-primary" to={alert.targetPath}>Open record</Link>}{alert.isUnread && <button className="btn btn-sm btn-outline-dark" onClick={() => updateAlert(alert.id, 'read')}>Mark read</button>}<button className="btn btn-sm btn-outline-dark" onClick={() => updateAlert(alert.id, 'dismiss')}>Dismiss</button></div></div>)}</div> : <EmptyState title="No active operational alerts" description="Current stock, payroll, rent, task, and lease conditions are all within their expected state." />}</section>
            <section className="panel overflow-hidden p-0"><div className="border-b border-white-light px-5 py-4 dark:border-[#191e3a]"><h2 className="font-bold">Recent activity</h2></div>{feed.activity.length ? <div className="divide-y divide-white-light dark:divide-[#191e3a]">{feed.activity.map((item) => <div className={`flex gap-4 p-5 ${item.isUnread ? 'bg-primary-light/40' : ''}`} key={item.id}><span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.isUnread ? 'bg-primary' : 'bg-white-dark/40'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.action} · {item.entity.replace(/_/g, ' ')}</p><time className="text-xs text-white-dark">{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-1 text-sm text-white-dark">{item.details || 'Activity recorded'} · {item.actorName}</p></div></div>)}</div> : <EmptyState title="No recent activity" />}</section>
        </div>}
    </AppShell>;
};

export default NotificationsPage;
