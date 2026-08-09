import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState, Modal, PageHeader, StatusPill, shortDate } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';
import { tenantHostname } from '../lib/tenant-domain';

type Company = any;
type Response = { data: Company[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
type ModuleForm = { constructionEnabled: boolean; realEstateEnabled: boolean; materialManagementEnabled: boolean };

const statuses = [
    { value: '', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING_SETUP', label: 'Pending' },
    { value: 'SUSPENDED', label: 'Suspended' },
];

const SuperAdminCompaniesPage = () => {
    const navigate = useNavigate();
    const [result, setResult] = useState<Response | null>(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [working, setWorking] = useState('');
    const [moduleCompany, setModuleCompany] = useState<Company | null>(null);
    const [moduleForm, setModuleForm] = useState<ModuleForm>({ constructionEnabled: false, realEstateEnabled: false, materialManagementEnabled: false });
    const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

    const query = useMemo(() => new URLSearchParams({
        page: String(page),
        pageSize: '20',
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
    }).toString(), [page, search, status]);

    const load = () => {
        setLoading(true);
        setError('');
        api<Response>(`/api/superadmin/companies?${query}`)
            .then(setResult)
            .catch((reason) => setError(reason.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const timer = window.setTimeout(load, 250);
        return () => window.clearTimeout(timer);
    }, [query]);

    const run = async (key: string, path: string, method: 'POST' | 'PATCH' | 'DELETE' = 'POST', body?: unknown, successMessage = 'Company updated successfully.') => {
        setWorking(key);
        setError('');
        setMessage('');
        try {
            await api(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
            await load();
            setMessage(successMessage);
            return true;
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Company action failed.');
            return false;
        } finally {
            setWorking('');
        }
    };

    const openModules = (company: Company) => {
        setModuleCompany(company);
        setModuleForm({
            constructionEnabled: Boolean(company.constructionEnabled),
            realEstateEnabled: Boolean(company.realEstateEnabled),
            materialManagementEnabled: Boolean(company.materialManagementEnabled),
        });
    };

    const saveModules = async () => {
        if (!moduleCompany) return;
        if (!moduleForm.constructionEnabled && !moduleForm.realEstateEnabled && !moduleForm.materialManagementEnabled) {
            setError('At least one module must remain enabled.');
            return;
        }
        await run(`modules-${moduleCompany.id}`, `/api/superadmin/companies/${moduleCompany.id}/modules`, 'PATCH', moduleForm);
        setModuleCompany(null);
    };

    const sendAdminResetCode = async (company: Company) => {
        const sent = await run(
            `reset-${company.id}`,
            '/api/auth/password/forgot',
            'POST',
            { email: company.adminEmail },
            `Password reset code sent to ${company.adminEmail}. It expires in 15 minutes.`,
        );
        if (sent) window.dispatchEvent(new Event('maamulpro:platform-notifications'));
    };

    const rows = result?.data || [];
    const meta = result?.meta;

    return <AppShell>
        <PageHeader
            eyebrow="Internal Admin"
            title="Companies"
            description={`${meta?.total || 0} ${meta?.total === 1 ? 'company' : 'companies'}`}
            actions={<Link className="btn btn-primary" to="/superadmin/companies/new"><Plus className="mr-1" size={16} /> New company</Link>}
        />

        <div className="mb-5 flex flex-col gap-4">
            <div className="flex w-fit items-center gap-1 rounded-md bg-gray-100 p-1 dark:bg-dark">
                {statuses.map((item) => <button
                    key={item.value || 'all'}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${status === item.value ? 'bg-white text-primary shadow dark:bg-black' : 'text-white-dark'}`}
                    type="button"
                    onClick={() => { setPage(1); setStatus(item.value); }}
                >{item.label}</button>)}
            </div>
            <input className="form-input max-w-lg" placeholder="Search company, slug or admin email…" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
        </div>

        {error && <ErrorAlert message={error} onRetry={load} />}
        {message && <div className="mb-5 rounded-md bg-success-light p-4 text-success">{message}</div>}

        {loading ? <div className="panel"><LoadingState /></div> : !rows.length ? <div className="panel"><EmptyState title="No companies found" description={status ? `No companies have ${status.replace(/_/g, ' ').toLowerCase()} status.` : 'Onboard the first company to begin.'} action={!status ? <Link className="btn btn-primary" to="/superadmin/companies/new">Onboard company</Link> : undefined} /></div> : <div className="panel overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="table-hover w-full">
                    <thead><tr><th>Company</th><th>Owner & Email</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                    <tbody>{rows.map((row) => <tr className="cursor-pointer" key={row.id} onClick={(event) => {
                        if (!(event.target as HTMLElement).closest('button, a')) navigate(`/superadmin/companies/${row.id}`);
                    }}>
                        <td>
                            <div className="flex items-center gap-3">
                                {row.logoUrl ? <img className="h-9 w-9 rounded-md border object-contain p-0.5" src={row.logoUrl} alt={`${row.name} logo`} /> : <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-light text-primary"><Building2 size={18} /></span>}
                                <div>
                                    <strong className="block font-bold text-black dark:text-white">{row.name}</strong>
                                    <code className="text-xs font-semibold text-primary">{tenantHostname(row.subdomain)}</code>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div className="text-sm">
                                <span className="block font-medium text-secondary dark:text-white">{row.adminName || 'Admin'}</span>
                                <span className="text-xs text-white-dark">{row.adminEmail}</span>
                            </div>
                        </td>
                        <td><StatusPill value={row.status} /></td>
                        <td>
                            <div className="flex items-center justify-end gap-2">
                                <button className={`btn btn-sm ${row.status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-success'}`} disabled={Boolean(working)} onClick={() => run(`status-${row.id}`, `/api/superadmin/companies/${row.id}/status`, 'PATCH', { status: row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button>
                                <button className="btn btn-sm btn-outline-primary" disabled={Boolean(working)} onClick={() => openModules(row)}>Modules</button>
                                <Link className="btn btn-sm btn-primary" to={`/superadmin/companies/${row.id}`}>Open</Link>
                            </div>
                        </td>
                    </tr>)}</tbody>
                </table>

            </div>
            {meta && <div className="flex items-center justify-between border-t border-white-light px-5 py-4 text-sm dark:border-dark">
                <span className="text-white-dark">Page {meta.page} of {meta.totalPages} · {meta.total} companies</span>
                <div className="flex gap-2"><button className="btn btn-sm btn-outline-primary" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>Previous</button><button className="btn btn-sm btn-outline-primary" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>Next</button></div>
            </div>}
        </div>}

        <Modal open={Boolean(moduleCompany)} onClose={() => setModuleCompany(null)} title={moduleCompany ? `Configure ${moduleCompany.name} modules` : 'Configure modules'}>
            <p className="mb-4 text-sm text-white-dark">These are direct tenant-level module controls. At least one module must remain enabled.</p>
            <div className="space-y-3">{([
                ['constructionEnabled', 'Construction'],
                ['realEstateEnabled', 'Real estate'],
                ['materialManagementEnabled', 'Material management'],
            ] as const).map(([key, label]) => <label className="flex cursor-pointer items-center justify-between rounded-md border border-white-light p-3 dark:border-dark" key={key}><span>{label}</span><input className="form-checkbox" type="checkbox" checked={moduleForm[key]} onChange={(event) => setModuleForm({ ...moduleForm, [key]: event.target.checked })} /></label>)}</div>
            <div className="mt-5 flex justify-end gap-2"><button className="btn btn-outline-dark" onClick={() => setModuleCompany(null)}>Cancel</button><button className="btn btn-primary" disabled={Boolean(working)} onClick={saveModules}>{working ? 'Saving…' : 'Save modules'}</button></div>
        </Modal>
        <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete company">
            <div className="space-y-4">
                <p className="text-white-dark">Permanently delete <strong>{deleteTarget?.name}</strong>, its central records and managed tenant database? This cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={Boolean(working)} onClick={() => setDeleteTarget(null)}>Cancel</button>
                    <button className="btn btn-danger" disabled={Boolean(working)} onClick={() => { const target = deleteTarget; setDeleteTarget(null); if (target) run(`delete-${target.id}`, `/api/superadmin/companies/${target.id}`, 'DELETE'); }}>{working ? 'Please wait…' : 'Delete company'}</button>
                </div>
            </div>
        </Modal>
    </AppShell>;
};

export default SuperAdminCompaniesPage;
