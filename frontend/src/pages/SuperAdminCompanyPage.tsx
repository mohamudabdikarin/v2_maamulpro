import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import {
    EmptyState,
    ErrorAlert,
    Field,
    LoadingState,
    Modal,
    PageHeader,
    StatGrid,
    StatusPill,
    money,
    shortDate,
} from '../components/maamulpro/PageKit';
import { api } from '../lib/api';

const moduleFields = [
    ['constructionEnabled', 'Construction'],
    ['realEstateEnabled', 'Real estate'],
    ['materialManagementEnabled', 'Materials'],
] as const;

const SuperAdminCompanyPage = () => {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState<any>(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<any>({});

    const load = () => api<any>(`/api/superadmin/companies/${id}`)
        .then((row) => {
            setCompany(row);
            setForm({
                name: row.name,
                adminName: row.adminName,
                adminEmail: row.adminEmail,
                companyType: row.companyType || '',
                phone: row.phone || '',
                address: row.address || '',
                description: row.description || '',
                logoUrl: row.logoUrl || '',
                constructionEnabled: Boolean(row.constructionEnabled),
                realEstateEnabled: Boolean(row.realEstateEnabled),
                materialManagementEnabled: Boolean(row.materialManagementEnabled),
            });
        })
        .catch((reason) => setError(reason.message));

    useEffect(() => { load(); }, [id]);

    const patch = async (path: string, body: unknown) => {
        setError('');
        try {
            await api(`/api/superadmin/companies/${id}/${path}`, {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Update failed');
        }
    };

    const save = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = { ...form };
            if (company?.subscriptions?.some((row: any) => ['ACTIVE', 'SUSPENDED'].includes(row.status))) {
                delete payload.constructionEnabled;
                delete payload.realEstateEnabled;
                delete payload.materialManagementEnabled;
            }
            const updated: any = await api(`/api/superadmin/companies/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            setEditing(false);
            await load();
            if (updated.synchronizationWarning) setError(updated.synchronizationWarning);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to save company');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!company || !window.confirm(`Delete ${company.name}'s platform record? The tenant database will be retained.`)) return;
        try {
            await api(`/api/superadmin/companies/${id}`, { method: 'DELETE' });
            navigate('/superadmin/companies', { replace: true });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to delete company');
        }
    };

    if (!company) {
        return <AppShell><PageHeader title="Company" />{error ? <ErrorAlert message={error} onRetry={load} /> : <div className="panel"><LoadingState /></div>}</AppShell>;
    }

    const effectiveSubscription = company.subscriptions?.find((row: any) => ['ACTIVE', 'SUSPENDED'].includes(row.status))
        || company.subscriptions?.find((row: any) => row.status === 'PENDING')
        || company.subscriptions?.[0];
    const planManaged = Boolean(effectiveSubscription && ['ACTIVE', 'SUSPENDED'].includes(effectiveSubscription.status));

    return <AppShell>
        <PageHeader
            eyebrow="Tenant administration"
            title={company.name}
            description={`${company.subdomain} · ${company.adminEmail}`}
            actions={<>
                <button className="btn btn-outline-primary" onClick={() => setEditing(true)}>Edit company</button>
                <Link className="btn btn-outline-primary" to="/superadmin/billing">Manage billing</Link>
                <Link className="btn btn-outline-dark" to="/superadmin/companies">Back</Link>
            </>}
        />
        {error && <ErrorAlert message={error} onRetry={load} />}
        <StatGrid items={[
            { label: 'Status', value: <StatusPill value={company.status} /> },
            { label: 'Plan', value: effectiveSubscription?.plan?.name || company.planKey || company.planTier || 'None', tone: 'info' },
            { label: 'Users', value: company.users?.length || 0 },
            { label: 'Subscription', value: money(company.subscriptionAmount), tone: 'success' },
        ]} />

        <div className="grid gap-6 xl:grid-cols-2">
            <section className="panel">
                <h2 className="text-lg font-bold">Company access</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {['ACTIVE', 'SUSPENDED', 'PENDING_SETUP'].map((status) => <button key={status} className={`btn ${company.status === status ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => patch('status', { status })}>{status.replace(/_/g, ' ')}</button>)}
                </div>
                <p className="mt-5 text-sm text-white-dark">{planManaged ? 'Workspace access is enforced by the active subscription plan.' : 'Workspace access can be staged until a paid plan becomes active.'}</p>
                <div className="mt-3 space-y-3">
                    {moduleFields.map(([key, label]) => <div className="flex items-center justify-between rounded-md bg-gray-50 p-4 dark:bg-dark" key={key}><span>{label}</span>{planManaged ? <StatusPill value={company[key] ? 'ENABLED' : 'DISABLED'} /> : <input className="form-checkbox" type="checkbox" checked={Boolean(company[key])} onChange={(event) => patch('modules', { [key]: event.target.checked })} />}</div>)}
                </div>
            </section>
            <section className="panel">
                <h2 className="text-lg font-bold">Tenant identity & entitlement</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div><dt>Owner</dt><dd className="font-bold">{company.adminName}</dd></div>
                    <div><dt>Email</dt><dd className="font-bold">{company.adminEmail}</dd></div>
                    <div><dt>Company type</dt><dd>{company.companyType || '—'}</dd></div>
                    <div><dt>Created</dt><dd>{shortDate(company.createdAt)}</dd></div>
                    <div><dt>Subscription expires</dt><dd>{shortDate(company.subscriptionExpiresAt)}</dd></div>
                    <div><dt>Access granted</dt><dd>{company.accessGranted ? 'Yes' : 'No'}</dd></div>
                </dl>
                <h3 className="mt-6 font-bold">Enforced limits</h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                    {Object.entries(company.entitlements?.limits || {}).map(([key, value]) => <div className="rounded bg-gray-50 p-3 dark:bg-dark" key={key}><dt className="text-xs text-white-dark">{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="font-bold">{Number(value) === 0 ? 'Unlimited' : String(value)}</dd></div>)}
                </dl>
            </section>
        </div>

        <section className="panel mt-6 overflow-hidden p-0">
            <div className="p-5"><h2 className="text-lg font-bold">Invoices</h2></div>
            {!company.invoices?.length ? <EmptyState title="No invoices" /> : <div className="overflow-x-auto"><table className="table-hover w-full"><thead><tr><th>Invoice</th><th>Type</th><th>Issued</th><th>Due</th><th>Expires</th><th>Amount</th><th>Status</th></tr></thead><tbody>{company.invoices.map((row: any) => <tr key={row.id}><td>{row.invoiceNumber}</td><td>{String(row.kind || 'INITIAL').replace(/_/g, ' ')}</td><td>{shortDate(row.createdAt)}</td><td>{shortDate(row.dueDate)}</td><td>{shortDate(row.expiresAt)}</td><td>{money(row.amount)}</td><td><StatusPill value={row.status} /></td></tr>)}</tbody></table></div>}
        </section>
        <div className="mt-6 flex justify-end"><button className="btn btn-outline-danger" onClick={remove}>Delete company</button></div>

        <Modal open={editing} onClose={() => setEditing(false)} title="Edit company" wide>
            <form className="grid gap-5 md:grid-cols-2" onSubmit={save}>
                <Field label="Company name" required><input className="form-input mt-1" required value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
                <Field label="Company type"><input className="form-input mt-1" value={form.companyType || ''} onChange={(event) => setForm({ ...form, companyType: event.target.value })} /></Field>
                <Field label="Owner name" required><input className="form-input mt-1" required value={form.adminName || ''} onChange={(event) => setForm({ ...form, adminName: event.target.value })} /></Field>
                <Field label="Owner email" required><input className="form-input mt-1" type="email" required value={form.adminEmail || ''} onChange={(event) => setForm({ ...form, adminEmail: event.target.value })} /></Field>
                <Field label="Phone"><input className="form-input mt-1" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
                <Field label="Logo URL"><input className="form-input mt-1" value={form.logoUrl || ''} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} /></Field>
                <div className="md:col-span-2"><Field label="Address"><input className="form-input mt-1" value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field></div>
                <div className="md:col-span-2"><Field label="Internal description"><textarea className="form-textarea mt-1" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
                {!planManaged && <div className="md:col-span-2 grid gap-3 sm:grid-cols-3">{moduleFields.map(([key, label]) => <label className="flex items-center gap-2 rounded border border-white-light p-3 dark:border-dark" key={key}><input className="form-checkbox" type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />{label}</label>)}</div>}
                <div className="flex justify-end gap-2 md:col-span-2"><button type="button" className="btn btn-outline-dark" onClick={() => setEditing(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
            </form>
        </Modal>
    </AppShell>;
};

export default SuperAdminCompanyPage;
