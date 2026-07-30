import { FormEvent, useEffect, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, Field, FormActions, LoadingState, Modal, PageHeader, StatGrid, StatusPill, shortDate } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';

type Report = { id: string; name: string; workspace: string; description?: string };
type Schedule = { id: string; reportId: string; name: string; frequency: string; recipients?: string; filters?: string; nextRunAt?: string; isActive: boolean };
const empty = { reportId: '', name: '', frequency: 'MONTHLY', recipients: '', startDate: '', endDate: '', entityId: '', nextRunAt: '', isActive: true };

const ReportSchedulesPage = () => {
    const [reports, setReports] = useState<Report[]>([]); const [rows, setRows] = useState<Schedule[]>([]); const [entities, setEntities] = useState<any[]>([]); const [form, setForm] = useState<any>(empty); const [editing, setEditing] = useState<Schedule | null>(null); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [deleteId, setDeleteId] = useState<string | null>(null);
    const load = () => { setLoading(true); Promise.all([api<Report[]>('/api/reports/registry'), api<Schedule[]>('/api/reports/schedules')]).then(([catalog, schedules]) => { setReports(catalog); setRows(schedules); }).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); };
    useEffect(() => { load(); }, []);
    useEffect(() => {
        const workspace = reports.find((report) => report.id === form.reportId)?.workspace;
        const endpoint = workspace === 'construction' ? '/api/construction/projects' : workspace === 'real_estate' ? '/api/real-estate/properties' : workspace === 'material_management' ? '/api/materials/products' : '';
        if (!endpoint) { setEntities([]); return; }
        api<any>(endpoint).then((result) => setEntities(Array.isArray(result) ? result : result.data || [])).catch(() => setEntities([]));
    }, [form.reportId, reports]);
    const edit = (row: Schedule) => { let filters: any = {}; try { filters = row.filters ? JSON.parse(row.filters) : {}; } catch {} setEditing(row); setForm({ ...empty, ...row, ...filters, nextRunAt: row.nextRunAt?.slice(0, 10) || '' }); setOpen(true); };
    const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); const filters = JSON.stringify({ startDate: form.startDate || undefined, endDate: form.endDate || undefined, entityId: form.entityId || undefined }); try { await api(editing ? `/api/reports/schedules/${editing.id}` : '/api/reports/schedules', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ reportId: form.reportId, name: form.name, frequency: form.frequency, recipients: form.recipients, filters, nextRunAt: form.nextRunAt || undefined, isActive: form.isActive }) }); setOpen(false); setEditing(null); setForm(empty); load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save schedule'); } };
    const confirmDelete = async () => { if (!deleteId) return; try { await api(`/api/reports/schedules/${deleteId}`, { method: 'DELETE' }); setDeleteId(null); load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete schedule'); } };
    const reportName = (id: string) => reports.find((report) => report.id === id)?.name || id;
    return <AppShell><PageHeader eyebrow="Automated reporting" title="Report schedules" description="Deliver selected reports to recipients on controlled weekly, monthly or yearly schedules." actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>New schedule</button>} />
        <StatGrid items={[{ label: 'Schedules', value: rows.length }, { label: 'Active', value: rows.filter((row) => row.isActive).length, tone: 'success' }, { label: 'Report catalog', value: reports.length, tone: 'info' }, { label: 'Monthly schedules', value: rows.filter((row) => row.frequency === 'MONTHLY').length, tone: 'warning' }]} />
        {error && <ErrorAlert message={error} onRetry={load} />}{loading ? <div className="panel"><LoadingState /></div> : !rows.length ? <div className="panel"><EmptyState title="No scheduled reports" description="Create a schedule to automate report delivery." /></div> : <div className="panel overflow-hidden p-0"><div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Schedule</th><th>Report</th><th>Frequency</th><th>Recipients</th><th>Next run</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="font-bold">{row.name}</td><td>{reportName(row.reportId)}</td><td>{row.frequency}</td><td className="max-w-xs truncate">{row.recipients || 'No recipients'}</td><td>{shortDate(row.nextRunAt)}</td><td><StatusPill value={row.isActive ? 'ACTIVE' : 'INACTIVE'} /></td><td><div className="flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => edit(row)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(row.id)}>Delete</button></div></td></tr>)}</tbody></table></div></div>}
        <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit report schedule' : 'New report schedule'} wide><form className="grid gap-5 md:grid-cols-2" onSubmit={submit}>
            <Field label="Report" required><select className="form-select mt-1" required value={form.reportId} onChange={(e) => setForm({ ...form, reportId: e.target.value })}><option value="">Select report…</option>{reports.map((report) => <option value={report.id} key={report.id}>{report.name} · {report.workspace.replace(/_/g, ' ')}</option>)}</select></Field>
            <Field label="Schedule name" required><input className="form-input mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Frequency" required><select className="form-select mt-1" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}><option>WEEKLY</option><option>MONTHLY</option><option>YEARLY</option></select></Field>
            <Field label="Next run date"><input className="form-input mt-1" type="date" value={form.nextRunAt} onChange={(e) => setForm({ ...form, nextRunAt: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Email recipients" hint="Comma-separated email addresses"><input className="form-input mt-1" type="text" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder="finance@example.com, owner@example.com" /></Field></div>
            <Field label="Report start date"><input className="form-input mt-1" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Report end date"><input className="form-input mt-1" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Project / property / material scope" hint="Optional scope used by the selected workspace report"><select className="form-select mt-1" value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })}><option value="">All records</option>{entities.map((entity) => <option value={entity.id} key={entity.id}>{entity.name || entity.title}</option>)}</select></Field></div>
            <label className="flex items-center gap-3"><input className="form-checkbox" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active schedule</label>
            <div className="md:col-span-2"><FormActions onCancel={() => setOpen(false)} saveLabel="Save schedule" /></div>
        </form></Modal>
        <Modal open={Boolean(deleteId)} onClose={() => setDeleteId(null)} title="Delete schedule">
            <div className="space-y-4">
                <p className="text-white-dark">Delete this report schedule? This action cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" onClick={() => setDeleteId(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={confirmDelete}>Delete schedule</button>
                </div>
            </div>
        </Modal>
    </AppShell>;
};

export default ReportSchedulesPage;
