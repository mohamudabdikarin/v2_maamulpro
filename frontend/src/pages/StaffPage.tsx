import { FormEvent, useEffect, useMemo, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { AuthenticatedImage } from '../components/maamulpro/AuthenticatedImage';
import { EmptyState, ErrorAlert, Field, FormActions, LoadingState, Modal, PageHeader, StatGrid, StatusPill, money, shortDate } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';
import { useApiRows } from '../hooks/useApiData';

type Staff = { id: string; firstName: string; lastName: string; phone?: string; position?: string; department: string; salary: number; hireDate?: string; status: string; notes?: string; photoUrl?: string; assignedProjectId?: string; user?: { id: string; email: string; role: string; isActive: boolean } };
type Role = { key: string; name: string };
const blank = { firstName: '', lastName: '', phone: '', position: '', department: 'GENERAL', salary: 0, hireDate: '', status: 'ACTIVE', notes: '', photoUrl: '', assignedProjectId: '', createAccount: false, email: '', role: 'STAFF', temporaryPassword: '' };

const StaffPage = () => {
    const state = useApiRows<Staff>('/api/staff?limit=100');
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('');
    const [status, setStatus] = useState('');
    const [selected, setSelected] = useState<Staff | null>(null);
    const [form, setForm] = useState<Record<string, any>>(blank);
    const [editing, setEditing] = useState<Staff | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [account, setAccount] = useState({ email: '', role: 'STAFF', temporaryPassword: '' });
    const [roles, setRoles] = useState<Role[]>([]);
    const [projects, setProjects] = useState<Record<string, any>[]>([]);
    const [activity, setActivity] = useState<Record<string, any>[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    useEffect(() => { Promise.all([api<Role[]>('/api/rbac/roles'), api<any>('/api/construction/projects')]).then(([roleRows, projectRows]) => { setRoles(roleRows); setProjects(Array.isArray(projectRows) ? projectRows : projectRows.data || []); }).catch(() => undefined); }, []);
    useEffect(() => { if (selected?.user) api<Record<string, any>[]>(`/api/staff/${selected.id}/activity`).then(setActivity).catch(() => setActivity([])); else setActivity([]); }, [selected]);
    const filtered = useMemo(() => state.rows.filter((row) => {
        const text = `${row.firstName} ${row.lastName} ${row.phone || ''} ${row.position || ''}`.toLowerCase();
        return text.includes(search.toLowerCase()) && (!department || row.department === department) && (!status || row.status === status);
    }), [state.rows, search, department, status]);
    const openCreate = () => { setEditing(null); setForm(blank); setFormOpen(true); };
    const openEdit = (row: Staff) => { setEditing(row); setForm({ ...blank, ...row, hireDate: row.hireDate?.slice(0, 10) || '', createAccount: false }); setFormOpen(true); };
    const upload = async (file?: File) => {
        if (!file) return;
        const data = new FormData(); data.append('file', file);
        try { const result = await api<{ url: string }>('/api/uploads/images?folder=staff', { method: 'POST', body: data }); setForm((current) => ({ ...current, photoUrl: result.url })); } catch (reason) { state.setError(reason instanceof Error ? reason.message : 'Upload failed'); }
    };
    const save = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true); state.setError('');
        try {
            const payload: any = { ...form, salary: Number(form.salary), hireDate: form.hireDate || undefined, assignedProjectId: form.assignedProjectId || undefined };
            if (editing) ['createAccount', 'email', 'role', 'temporaryPassword'].forEach((key) => delete payload[key]);
            await api(editing ? `/api/staff/${editing.id}` : '/api/staff', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
            setFormOpen(false); setMessage('Staff record saved successfully.'); await state.reload();
        } catch (reason) { state.setError(reason instanceof Error ? reason.message : 'Unable to save staff'); } finally { setSaving(false); }
    };
    const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
    const [deleting, setDeleting] = useState(false);
    const confirmDelete = async () => { if (!deleteTarget) return; setDeleting(true); try { await api(`/api/staff/${deleteTarget.id}`, { method: 'DELETE' }); setDeleteTarget(null); setSelected(null); await state.reload(); } catch (reason) { state.setError(reason instanceof Error ? reason.message : 'Unable to delete staff'); } finally { setDeleting(false); } };
    const saveAccount = async (event: FormEvent) => {
        event.preventDefault(); if (!selected) return; setSaving(true);
        try { await api(`/api/staff/${selected.id}/account`, { method: 'POST', body: JSON.stringify(account) }); setAccountOpen(false); setMessage('User account created.'); await state.reload(); setSelected(await api<Staff>(`/api/staff/${selected.id}`)); } catch (reason) { state.setError(reason instanceof Error ? reason.message : 'Unable to create account'); } finally { setSaving(false); }
    };
    const [accountActionType, setAccountActionType] = useState<'status' | 'email' | 'password' | null>(null);
    const [accountActionValue, setAccountActionValue] = useState('');
    const [accountActionSaving, setAccountActionSaving] = useState(false);
    const executeAccountAction = async () => {
        if (!selected?.user || !accountActionType) return;
        setAccountActionSaving(true);
        try {
            const path = accountActionType === 'status' ? 'status' : accountActionType === 'email' ? 'email' : 'reset-password';
            const body = accountActionType === 'status' ? { isActive: !selected.user.isActive } : accountActionType === 'email' ? { email: accountActionValue } : { temporaryPassword: accountActionValue };
            await api(`/api/staff/${selected.id}/account/${path}`, { method: accountActionType === 'password' ? 'POST' : 'PATCH', body: JSON.stringify(body) });
            setAccountActionType(null); setAccountActionValue('');
            setMessage('Account updated successfully.'); await state.reload(); setSelected(await api<Staff>(`/api/staff/${selected.id}`));
        } catch (reason) { state.setError(reason instanceof Error ? reason.message : 'Account update failed'); } finally { setAccountActionSaving(false); }
    };
    return <AppShell>
        <PageHeader eyebrow="People & access" title="Staff Management" description="Employees, project assignments, workforce status, user accounts and security activity." actions={<button className="btn btn-primary" onClick={openCreate}>Add staff member</button>} />
        {message && <div className="mb-5 rounded-md bg-success-light p-4 text-success">{message}</div>}
        {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}
        <StatGrid items={[
            { label: 'Total staff', value: state.rows.length }, { label: 'Active', value: state.rows.filter((row) => row.status === 'ACTIVE').length, tone: 'success' },
            { label: 'User accounts', value: state.rows.filter((row) => row.user).length }, { label: 'Monthly salaries', value: money(state.rows.filter((row) => row.status === 'ACTIVE').reduce((sum, row) => sum + Number(row.salary), 0)), tone: 'primary' },
        ]} />
        <div className="panel mb-5 grid gap-3 md:grid-cols-3"><input className="form-input" placeholder="Search staff…" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="form-select" value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">All departments</option>{['GENERAL', 'CONSTRUCTION', 'REAL_ESTATE', 'MATERIAL_MANAGEMENT'].map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}</select><select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'].map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}</select></div>
        <div className="panel overflow-hidden p-0">{state.loading ? <LoadingState /> : !filtered.length ? <EmptyState title="No staff members found" action={<button className="btn btn-primary" onClick={openCreate}>Add staff member</button>} /> : <div className="overflow-x-auto"><table className="table-hover w-full"><thead><tr><th>Employee</th><th>Department</th><th>Position</th><th>Status</th><th>Account</th><th>Salary</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><button className="flex items-center gap-3 text-left" onClick={() => setSelected(row)}>{row.photoUrl ? <AuthenticatedImage className="h-10 w-10 rounded-full object-cover" src={row.photoUrl} alt="" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-light font-bold text-primary">{row.firstName[0]}{row.lastName[0]}</span>}<span><strong>{row.firstName} {row.lastName}</strong><small className="block text-white-dark">{row.phone || 'No phone'}</small></span></button></td><td>{row.department.replace(/_/g, ' ')}</td><td>{row.position || '—'}</td><td><StatusPill value={row.status} /></td><td>{row.user ? <StatusPill value={row.user.isActive ? 'ACTIVE' : 'INACTIVE'} /> : <span className="text-white-dark">No login</span>}</td><td>{money(row.salary)}</td><td><div className="flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(row)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget(row)}>Terminate</button></div></td></tr>)}</tbody></table></div>}</div>
        <Modal title={editing ? 'Edit staff member' : 'Add staff member'} open={formOpen} onClose={() => setFormOpen(false)} wide><form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
            {form.photoUrl && <AuthenticatedImage className="h-24 w-24 rounded-full object-cover md:col-span-2" src={form.photoUrl} alt="" />}<Field label="Staff photo"><input className="form-input mt-1" type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0])} /></Field>
            <Field label="First name" required><input className="form-input mt-1" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field><Field label="Last name" required><input className="form-input mt-1" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            {['phone', 'position'].map((key) => <Field label={key[0].toUpperCase() + key.slice(1)} key={key}><input className="form-input mt-1" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>)}
            <Field label="Department"><select className="form-select mt-1" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>{['GENERAL', 'CONSTRUCTION', 'REAL_ESTATE', 'MATERIAL_MANAGEMENT'].map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}</select></Field><Field label="Status"><select className="form-select mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'].map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}</select></Field>
            <Field label="Salary"><input className="form-input mt-1" type="number" min="0" step=".01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field><Field label="Hire date"><input className="form-input mt-1" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></Field>
            <Field label="Assigned project"><select className="form-select mt-1" value={form.assignedProjectId} onChange={(e) => setForm({ ...form, assignedProjectId: e.target.value })}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
            <div className="md:col-span-2"><Field label="Notes"><textarea className="form-textarea mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
            {!editing && <><label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" className="form-checkbox" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />Create a login account now</label>{form.createAccount && <><Field label="Email" required><input type="email" className="form-input mt-1" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Role"><select className="form-select mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}</select></Field><Field label="Temporary password" required hint="12+ characters with uppercase, lowercase, number, and symbol."><input type="password" minLength={12} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,200}" className="form-input mt-1" required value={form.temporaryPassword} onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })} /></Field></>}</>}
            <FormActions onCancel={() => setFormOpen(false)} loading={saving} saveLabel="Save staff member" savingLabel="Saving…" />
        </form></Modal>
        <Modal title={selected ? `${selected.firstName} ${selected.lastName}` : 'Staff details'} open={Boolean(selected)} onClose={() => setSelected(null)} wide>{selected && <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Department', selected.department], ['Position', selected.position], ['Hire date', shortDate(selected.hireDate)], ['Salary', money(selected.salary)]].map(([label, value]) => <div key={label}><p className="text-xs uppercase text-white-dark">{label}</p><p className="mt-1 font-bold">{value || '—'}</p></div>)}</div><div className="rounded-lg border border-white-light p-4 dark:border-[#191e3a]"><h3 className="font-bold">User account</h3>{selected.user ? <><p className="mt-2">{selected.user.email} · {selected.user.role}</p><div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-warning" onClick={() => { setAccountActionType('status'); setAccountActionValue(''); }}>{selected.user.isActive ? 'Deactivate' : 'Activate'}</button><button className="btn btn-sm btn-outline-primary" onClick={() => { setAccountActionType('email'); setAccountActionValue(selected.user!.email); }}>Change email</button><button className="btn btn-sm btn-outline-danger" onClick={() => { setAccountActionType('password'); setAccountActionValue(''); }}>Reset password</button></div></> : <button className="btn btn-primary mt-3" onClick={() => { setAccount({ email: '', role: 'STAFF', temporaryPassword: '' }); setAccountOpen(true); }}>Create login account</button>}</div><div><h3 className="mb-3 font-bold">Recent activity</h3>{!activity.length ? <p className="text-white-dark">No account activity recorded.</p> : <div className="max-h-64 space-y-2 overflow-y-auto">{activity.map((item) => <div key={item.id || item.createdAt} className="rounded-md bg-gray-50 p-3 dark:bg-dark"><strong>{item.action}</strong> · {item.entity}<span className="float-right text-xs text-white-dark">{shortDate(item.createdAt)}</span><p className="text-xs text-white-dark">{item.details}</p></div>)}</div>}</div></div>}</Modal>
        <Modal title="Create staff login" open={accountOpen} onClose={() => setAccountOpen(false)}><form className="space-y-4" onSubmit={saveAccount}><Field label="Email" required><input className="form-input mt-1" type="email" required value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /></Field><Field label="Role"><select className="form-select mt-1" value={account.role} onChange={(e) => setAccount({ ...account, role: e.target.value })}>{roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}</select></Field><Field label="Temporary password" required hint="12+ characters with uppercase, lowercase, number, and symbol."><input className="form-input mt-1" type="password" minLength={12} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,200}" required value={account.temporaryPassword} onChange={(e) => setAccount({ ...account, temporaryPassword: e.target.value })} /></Field><FormActions onCancel={() => setAccountOpen(false)} loading={saving} saveLabel="Create account" savingLabel="Creating…" /></form></Modal>
        <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Terminate staff member">
            <div className="space-y-4">
                <p className="text-white-dark">This action permanently terminates <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> and cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button>
                    <button className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Please wait…' : 'Terminate'}</button>
                </div>
            </div>
        </Modal>
        <Modal open={accountActionType === 'email'} onClose={() => setAccountActionType(null)} title="Change email address">
            <div className="space-y-4">
                <p className="text-white-dark">Enter the new email address for this staff member.</p>
                <input className="form-input" type="email" value={accountActionValue} onChange={(e) => setAccountActionValue(e.target.value)} placeholder="New email address" />
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={accountActionSaving} onClick={() => setAccountActionType(null)}>Cancel</button>
                    <button className="btn btn-primary" disabled={accountActionSaving || !accountActionValue} onClick={executeAccountAction}>{accountActionSaving ? 'Saving…' : 'Update email'}</button>
                </div>
            </div>
        </Modal>
        <Modal open={accountActionType === 'password'} onClose={() => setAccountActionType(null)} title="Reset password">
            <div className="space-y-4">
                <p className="text-white-dark">Enter a temporary password (12+ characters with uppercase, lowercase, number, and symbol).</p>
                <input className="form-input" type="password" minLength={12} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,200}" value={accountActionValue} onChange={(e) => setAccountActionValue(e.target.value)} placeholder="Temporary password" />
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={accountActionSaving} onClick={() => setAccountActionType(null)}>Cancel</button>
                    <button className="btn btn-danger" disabled={accountActionSaving || !accountActionValue || accountActionValue.length < 12} onClick={executeAccountAction}>{accountActionSaving ? 'Saving…' : 'Reset password'}</button>
                </div>
            </div>
        </Modal>
        <Modal open={accountActionType === 'status'} onClose={() => setAccountActionType(null)} title={selected?.user?.isActive ? 'Deactivate account' : 'Activate account'}>
            <div className="space-y-4">
                <p className="text-white-dark">Are you sure you want to {selected?.user?.isActive ? 'deactivate' : 'activate'} the account for <strong>{selected?.firstName} {selected?.lastName}</strong>?</p>
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={accountActionSaving} onClick={() => setAccountActionType(null)}>Cancel</button>
                    <button className={`btn ${selected?.user?.isActive ? 'btn-warning' : 'btn-success'}`} disabled={accountActionSaving} onClick={executeAccountAction}>{accountActionSaving ? 'Saving…' : selected?.user?.isActive ? 'Deactivate' : 'Activate'}</button>
                </div>
            </div>
        </Modal>
    </AppShell>;
};

export default StaffPage;
