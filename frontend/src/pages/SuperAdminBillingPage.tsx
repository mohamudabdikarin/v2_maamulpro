import { FormEvent, useEffect, useMemo, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import {
    EmptyState,
    ErrorAlert,
    LoadingState,
    PageHeader,
    StatGrid,
    StatusPill,
    money,
    shortDate,
} from '../components/maamulpro/PageKit';
import { api } from '../lib/api';

type Plan = {
    id: string;
    name: string;
    key: string;
    priceMonthly: number;
    priceYearly: number;
    isActive: boolean;
};
type Invoice = {
    id: string;
    invoiceNumber: string;
    kind: string;
    amount: number;
    status: string;
    dueDate: string;
    expiresAt: string;
    periodStart: string;
    periodEnd: string;
    paidAt?: string;
};
type Subscription = {
    id: string;
    status: string;
    billingCycle: string;
    amount: number;
    startAt: string;
    expiresAt: string;
    autoRenew: boolean;
    plan: Plan;
};
type Company = {
    id: string;
    name: string;
    status: string;
    subscriptionStatus: string;
    accessGranted: boolean;
    entitlements?: {
        features?: Record<string, boolean>;
        limits?: Record<string, number>;
    };
    subscriptions?: Subscription[];
    invoices?: Invoice[];
};

const SuperAdminBillingPage = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [companyId, setCompanyId] = useState('');
    const [planId, setPlanId] = useState('');
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);
    const currentSubscription = company?.subscriptions?.find((row) => ['ACTIVE', 'SUSPENDED'].includes(row.status))
        || company?.subscriptions?.find((row) => row.status === 'PENDING')
        || company?.subscriptions?.[0];

    const loadCompany = async (id: string) => {
        if (!id) return setCompany(null);
        setCompany(await api<Company>(`/api/superadmin/companies/${id}`));
    };

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [companyRows, planRows] = await Promise.all([
                api<Company[]>('/api/superadmin/companies'),
                api<Plan[]>('/api/superadmin/plans'),
            ]);
            setCompanies(companyRows);
            setPlans(planRows);
            const nextCompanyId = companyId || companyRows[0]?.id || '';
            const nextPlanId = planId || planRows.find((row) => row.isActive)?.id || '';
            setCompanyId(nextCompanyId);
            setPlanId(nextPlanId);
            await loadCompany(nextCompanyId);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to load subscriptions and billing');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (companyId && !loading) {
            loadCompany(companyId).catch((reason) => setError(reason.message));
        }
    }, [companyId]);

    const run = async (key: string, path: string, method: 'POST' | 'PATCH' = 'POST', body: unknown = {}) => {
        setWorking(key);
        setError('');
        setMessage('');
        try {
            await api(path, { method, body: JSON.stringify(body) });
            await loadCompany(companyId);
            setMessage('Billing lifecycle updated successfully.');
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Billing action failed');
        } finally {
            setWorking('');
        }
    };

    const assign = async (event: FormEvent) => {
        event.preventDefault();
        if (!companyId || !planId) return;
        await run('assign', '/api/superadmin/subscriptions/assign', 'POST', { companyId, planId, billingCycle });
    };

    const openInvoices = company?.invoices?.filter((row) => ['UNPAID', 'OVERDUE'].includes(row.status)) || [];
    const paidInvoices = company?.invoices?.filter((row) => row.status === 'PAID') || [];

    return <AppShell>
        <PageHeader
            eyebrow="Platform revenue operations"
            title="Subscriptions & billing"
            description="Invoice-first activation, renewals, payment settlement, suspension, cancellation and expiry."
        />
        {error && <ErrorAlert message={error} onRetry={load} />}
        {message && <div className="mb-5 rounded-md bg-success-light p-4 text-success">{message}</div>}
        {loading ? <div className="panel"><LoadingState /></div> : <>
            <StatGrid items={[
                { label: 'Companies', value: companies.length },
                { label: 'Open invoices', value: openInvoices.length, tone: 'warning' },
                { label: 'Outstanding', value: money(openInvoices.reduce((sum, row) => sum + Number(row.amount), 0)), tone: 'danger' },
                { label: 'Settled invoices', value: paidInvoices.length, tone: 'success' },
            ]} />
            <form className="panel mx-auto mb-6 grid max-w-5xl gap-5 md:grid-cols-3" onSubmit={assign}>
                <div><label>Company</label><select className="form-select mt-1" required value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
                <div><label>Active plan</label><select className="form-select mt-1" required value={planId} onChange={(event) => setPlanId(event.target.value)}>{activePlans.map((row) => <option key={row.id} value={row.id}>{row.name} · {money(row.priceMonthly)}/mo</option>)}</select></div>
                <div><label>Billing cycle</label><select className="form-select mt-1" value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as 'MONTHLY' | 'YEARLY')}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></div>
                <p className="text-sm text-white-dark md:col-span-2">Paid plans remain pending until their invoice is settled. Assigning a replacement plan does not interrupt the current paid term.</p>
                <div className="flex justify-end"><button className="btn btn-primary" disabled={working === 'assign' || !activePlans.length}>{working === 'assign' ? 'Creating invoice…' : 'Assign plan & create invoice'}</button></div>
            </form>

            {company && <div className="mb-6 grid gap-6 xl:grid-cols-3">
                <section className="panel xl:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="text-xs font-bold uppercase text-primary">Current subscription</p><h2 className="mt-1 text-xl font-bold">{currentSubscription?.plan?.name || 'No subscription assigned'}</h2></div>
                        <StatusPill value={currentSubscription?.status || company.subscriptionStatus} />
                    </div>
                    {currentSubscription ? <>
                        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div><dt>Billing</dt><dd className="font-bold">{currentSubscription.billingCycle}</dd></div>
                            <div><dt>Amount</dt><dd className="font-bold">{money(currentSubscription.amount)}</dd></div>
                            <div><dt>Period ends</dt><dd className="font-bold">{shortDate(currentSubscription.expiresAt)}</dd></div>
                            <div><dt>Auto-renew</dt><dd className="font-bold">{currentSubscription.autoRenew ? 'Enabled' : 'Disabled'}</dd></div>
                        </dl>
                        <div className="mt-6 flex flex-wrap gap-2">
                            {['ACTIVE', 'EXPIRED'].includes(currentSubscription.status) && <button className="btn btn-outline-primary" disabled={Boolean(working)} onClick={() => run('renew', `/api/superadmin/companies/${company.id}/subscription/renew`)}>Create renewal invoice</button>}
                            {currentSubscription.status === 'ACTIVE' && <button className="btn btn-outline-warning" disabled={Boolean(working)} onClick={() => run('suspend', `/api/superadmin/companies/${company.id}/subscription/suspend`)}>Suspend</button>}
                            {currentSubscription.status === 'SUSPENDED' && <button className="btn btn-success" disabled={Boolean(working)} onClick={() => run('resume', `/api/superadmin/companies/${company.id}/subscription/resume`)}>Resume</button>}
                            {['ACTIVE', 'SUSPENDED'].includes(currentSubscription.status) && <button className="btn btn-outline-danger" disabled={Boolean(working)} onClick={() => window.confirm('Cancel this subscription immediately and revoke access?') && run('cancel', `/api/superadmin/companies/${company.id}/subscription/cancel`)}>Cancel subscription</button>}
                            {['ACTIVE', 'SUSPENDED'].includes(currentSubscription.status) && <button className="btn btn-outline-dark" disabled={Boolean(working)} onClick={() => run('auto-renew', `/api/superadmin/companies/${company.id}/subscription/auto-renew`, 'PATCH', { autoRenew: !currentSubscription.autoRenew })}>{currentSubscription.autoRenew ? 'Disable auto-renew' : 'Enable auto-renew'}</button>}
                        </div>
                    </> : <EmptyState title="No subscription history" description="Assign an active plan to create the first invoice." />}
                </section>
                <section className="panel">
                    <h2 className="font-bold">Enforced plan access</h2>
                    <p className="mt-1 text-sm text-white-dark">These values are synchronized from the plan and cannot be bypassed with company settings.</p>
                    <div className="mt-4 flex flex-wrap gap-2">{Object.entries(company.entitlements?.features || {}).map(([key, enabled]) => <span className={`badge ${enabled ? 'bg-success-light text-success' : 'bg-gray-100 text-white-dark dark:bg-dark'}`} key={key}>{key.replace(/([A-Z])/g, ' $1')}: {enabled ? 'On' : 'Off'}</span>)}</div>
                    <dl className="mt-5 space-y-2">{Object.entries(company.entitlements?.limits || {}).map(([key, value]) => <div className="flex justify-between rounded bg-gray-50 p-2 dark:bg-dark" key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="font-bold">{Number(value) === 0 ? 'Unlimited' : value}</dd></div>)}</dl>
                </section>
            </div>}

            <section className="panel overflow-hidden p-0">
                <div className="border-b border-white-light p-5 dark:border-[#191e3a]"><h2 className="text-lg font-bold">{company?.name || 'Company'} invoices</h2><p className="text-sm text-white-dark">Overdue invoices remain payable until their explicit expiry date.</p></div>
                {!company?.invoices?.length ? <EmptyState title="No invoices" description="Invoices appear after a plan is assigned or a renewal is prepared." /> : <div className="overflow-x-auto"><table className="table-hover w-full"><thead><tr><th>Invoice</th><th>Type</th><th>Period</th><th>Amount</th><th>Status</th><th>Due / expires</th><th>Action</th></tr></thead><tbody>{company.invoices.map((invoice) => <tr key={invoice.id}><td className="font-semibold">{invoice.invoiceNumber}</td><td>{invoice.kind.replace(/_/g, ' ')}</td><td>{shortDate(invoice.periodStart)} – {shortDate(invoice.periodEnd)}</td><td>{money(invoice.amount)}</td><td><StatusPill value={invoice.status} /></td><td>{shortDate(invoice.dueDate)}<small className="block text-white-dark">Expires {shortDate(invoice.expiresAt)}</small></td><td><div className="flex gap-2">{['UNPAID', 'OVERDUE'].includes(invoice.status) && <><button className="btn btn-sm btn-success" disabled={Boolean(working)} onClick={() => run(`pay-${invoice.id}`, `/api/superadmin/invoices/${invoice.id}/pay`, 'POST', { paymentMethod: 'MANUAL_BANK_TRANSFER' })}>Mark paid</button><button className="btn btn-sm btn-outline-danger" disabled={Boolean(working)} onClick={() => run(`cancel-${invoice.id}`, `/api/superadmin/invoices/${invoice.id}/cancel`)}>Cancel</button></>}</div></td></tr>)}</tbody></table></div>}
            </section>
        </>}
    </AppShell>;
};

export default SuperAdminBillingPage;
