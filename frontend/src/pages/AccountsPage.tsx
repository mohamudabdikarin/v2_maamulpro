import { FormEvent, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, Field, FormActions, LoadingState, Modal, PageHeader, StatGrid } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';
import { useApiRows } from '../hooks/useApiData';

const blank = { code: '', name: '', type: 'EXPENSE', parentCode: '' };
const AccountsPage = () => {
    const state = useApiRows<Record<string, any>>('/api/financials/accounts');
    const [form, setForm] = useState(blank);
    const [editing, setEditing] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [deleteCode, setDeleteCode] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const save = async (event: FormEvent) => { event.preventDefault(); try { await api(editing ? `/api/financials/accounts/${editing}` : '/api/financials/accounts', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ ...form, parentCode: form.parentCode || undefined }) }); setOpen(false); await state.reload(); } catch (reason) { state.setError(reason instanceof Error ? reason.message : 'Unable to save account'); } };
    const confirmDelete = async () => { if (!deleteCode) return; setDeleting(true); try { await api(`/api/financials/accounts/${deleteCode}`, { method: 'DELETE' }); setDeleteCode(null); await state.reload(); } catch (reason) { state.setError(reason instanceof Error ? reason.message : 'Unable to delete account'); } finally { setDeleting(false); } };
    const roots = state.rows.filter((row) => !row.parentCode);
    return <AppShell><PageHeader eyebrow="Accounting structure" title="Chart of Accounts" description="Maintain the account hierarchy used by journals, reporting and payroll expense posting." actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>Add account</button>} />{state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}<StatGrid items={[{ label: 'Accounts', value: state.rows.length }, { label: 'Assets', value: state.rows.filter((row) => row.type === 'ASSET').length }, { label: 'Income', value: state.rows.filter((row) => row.type === 'INCOME').length, tone: 'success' }, { label: 'Expenses', value: state.rows.filter((row) => row.type === 'EXPENSE').length, tone: 'danger' }]} /><div className="panel overflow-hidden p-0">{state.loading ? <LoadingState /> : !state.rows.length ? <EmptyState title="No accounts configured" /> : <div className="overflow-x-auto"><table className="table-hover w-full"><thead><tr><th>Code</th><th>Account name</th><th>Type</th><th>Parent</th><th /></tr></thead><tbody>{state.rows.map((row) => <tr key={row.code}><td className="font-mono font-bold">{row.code}</td><td style={{ paddingLeft: row.parentCode ? 40 : undefined }}>{row.parentCode && '↳ '}{row.name}</td><td><span className="badge bg-primary-light text-primary">{row.type}</span></td><td>{row.parentCode || 'Root account'}</td><td><div className="flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => { setEditing(row.code); setForm({ code: row.code, name: row.name, type: row.type, parentCode: row.parentCode || '' }); setOpen(true); }}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteCode(row.code)}>Delete</button></div></td></tr>)}</tbody></table></div>}</div><Modal title={editing ? 'Edit account' : 'Add account'} open={open} onClose={() => setOpen(false)}><form className="space-y-4" onSubmit={save}><Field label="Account code" required><input className="form-input mt-1" required disabled={Boolean(editing)} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field><Field label="Account name" required><input className="form-input mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Type"><select className="form-select mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((value) => <option>{value}</option>)}</select></Field><Field label="Parent account"><select className="form-select mt-1" value={form.parentCode} onChange={(e) => setForm({ ...form, parentCode: e.target.value })}><option value="">Root account</option>{roots.filter((row) => row.code !== editing).map((row) => <option value={row.code}>{row.code} · {row.name}</option>)}</select></Field><FormActions onCancel={() => setOpen(false)} saveLabel="Save account" /></form></Modal>
        <Modal open={Boolean(deleteCode)} onClose={() => setDeleteCode(null)} title="Delete account">
            <div className="space-y-4">
                <p className="text-white-dark">This action permanently removes account <strong>{deleteCode}</strong> and cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={deleting} onClick={() => setDeleteCode(null)}>Cancel</button>
                    <button className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Please wait…' : 'Delete account'}</button>
                </div>
            </div>
        </Modal>
    </AppShell>;
};
export default AccountsPage;
