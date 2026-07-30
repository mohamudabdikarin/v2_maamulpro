import { useMemo, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import {
    EmptyState,
    ErrorAlert,
    LoadingState,
    Modal,
    PageHeader,
    StatGrid,
    humanize,
    shortDate,
} from '../components/maamulpro/PageKit';
import { api } from '../lib/api';
import { useApiRows } from '../hooks/useApiData';

const AuditsPage = () => {
    const state = useApiRows<Record<string, any>>('/api/settings/activity-logs?limit=100');
    const [search, setSearch] = useState('');
    const [entity, setEntity] = useState('');
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
    const [clearing, setClearing] = useState(false);
    const rows = useMemo(
        () => state.rows.filter(
            (row) => (!entity || row.entity === entity)
                && JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
        ),
        [state.rows, search, entity],
    );
    const entities = [...new Set(state.rows.map((row) => row.entity).filter(Boolean))];

    const clear = async () => {
        setClearing(true);
        try {
            await api('/api/settings/activity-logs', { method: 'DELETE' });
            setClearConfirmOpen(false);
            await state.reload();
        } catch (reason) {
            state.setError(reason instanceof Error ? reason.message : 'Unable to clear logs');
        } finally {
            setClearing(false);
        }
    };

    return (
        <AppShell>
            <PageHeader
                eyebrow="Security & compliance"
                title="Audit Logs"
                description="Review user activity and data changes recorded across the company."
                actions={<button className="btn btn-outline-danger" onClick={() => setClearConfirmOpen(true)}>Clear audit log</button>}
            />
            {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}
            <StatGrid items={[
                { label: 'Entries loaded', value: state.rows.length },
                { label: 'Users', value: new Set(state.rows.map((row) => row.userId)).size },
                { label: 'Entities', value: entities.length },
                {
                    label: 'Today',
                    value: state.rows.filter(
                        (row) => new Date(row.createdAt).toDateString() === new Date().toDateString(),
                    ).length,
                },
            ]} />
            <div className="panel mb-5 grid gap-3 sm:grid-cols-2">
                <input
                    className="form-input"
                    placeholder="Search action, user, details or IP…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <select
                    className="form-select"
                    value={entity}
                    onChange={(event) => setEntity(event.target.value)}
                >
                    <option value="">All entities</option>
                    {entities.map((value) => (
                        <option key={value} value={value}>{humanize(value)}</option>
                    ))}
                </select>
            </div>
            <div className="panel overflow-hidden p-0">
                {state.loading
                    ? <LoadingState />
                    : !rows.length
                        ? <EmptyState title="No audit activity found" />
                        : (
                            <div className="overflow-x-auto">
                                <table className="table-hover w-full">
                                    <thead>
                                        <tr>
                                            <th>When</th>
                                            <th>Action</th>
                                            <th>Entity</th>
                                            <th>User</th>
                                            <th>Details</th>
                                            <th>Origin</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr key={row.id}>
                                                <td>
                                                    {shortDate(row.createdAt)}
                                                    <small className="block text-white-dark">
                                                        {new Date(row.createdAt).toLocaleTimeString()}
                                                    </small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-primary-light text-primary">
                                                        {humanize(row.action)}
                                                    </span>
                                                </td>
                                                <td>{humanize(row.entity)}</td>
                                                <td>{row.user?.name || row.user?.email || 'System'}</td>
                                                <td className="max-w-md whitespace-normal">
                                                    {row.details || humanize(row.resource || '') || '—'}
                                                </td>
                                                <td>
                                                    {row.ipAddress || '—'}
                                                    <small className="block max-w-48 truncate text-white-dark">
                                                        {row.deviceInfo}
                                                    </small>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
            </div>
        <Modal open={clearConfirmOpen} onClose={() => !clearing && setClearConfirmOpen(false)} title="Clear audit log">
            <div className="space-y-4">
                <p className="text-white-dark">Clear all audit log entries? This action permanently removes all records and cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={clearing} onClick={() => setClearConfirmOpen(false)}>Cancel</button>
                    <button className="btn btn-danger" disabled={clearing} onClick={clear}>{clearing ? 'Clearing…' : 'Clear all entries'}</button>
                </div>
            </div>
        </Modal>
        </AppShell>
    );
};

export default AuditsPage;
