import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { ErrorAlert, Field, PageHeader } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';

type NeonStatus = {
    provider: 'neon';
    automaticProvisioning: boolean;
    encryptedTenantCredentials: boolean;
    runtimeConnection: 'pooled';
    migrationConnection: 'direct';
};
type Plan = { id: string; name: string; description?: string; priceMonthly: number; priceYearly: number; isActive: boolean };

const CompanyOnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [neonStatus, setNeonStatus] = useState<NeonStatus | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [form, setForm] = useState({
        name: '',
        subdomain: '',
        companyType: '',
        dbUrl: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        planId: '',
        billingCycle: 'MONTHLY',
    });

    useEffect(() => {
        api<NeonStatus>('/api/superadmin/neon/status')
            .then(setNeonStatus)
            .catch(() => setNeonStatus(null));
        api<Plan[]>('/api/superadmin/plans')
            .then((rows) => {
                const active = rows.filter((row) => row.isActive);
                setPlans(active);
                setForm((current) => ({ ...current, planId: current.planId || active[0]?.id || '' }));
            })
            .catch((reason) => setError(reason.message));
    }, []);

    const update = (name: string, value: string | boolean) =>
        setForm((current) => ({ ...current, [name]: value }));

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (step < 3) {
            setStep(step + 1);
            return;
        }
        setSaving(true);
        setError('');
        try {
            const { dbUrl, ...companyData } = form;
            const company = await api<any>('/api/superadmin/companies', {
                method: 'POST',
                body: JSON.stringify({
                    ...companyData,
                    ...(dbUrl.trim() ? { dbUrl: dbUrl.trim() } : {}),
                }),
            });
            navigate(`/superadmin/companies/${company.id}`, { replace: true });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to provision company');
        } finally {
            setSaving(false);
        }
    };

    const automaticNeon = neonStatus?.automaticProvisioning === true;

    return (
        <AppShell>
            <PageHeader
                eyebrow="Tenant provisioning"
                title="Onboard a company"
                description="Create an isolated Neon database, owner account and invoice-backed subscription as one controlled operation."
                actions={<Link className="btn btn-outline-dark" to="/superadmin/companies">Cancel</Link>}
            />
            <div className="mx-auto max-w-3xl">
                <div className="mb-6 grid grid-cols-3 gap-2">
                    {['Company', 'Owner & Neon', 'Subscription'].map((label, index) => (
                        <div
                            key={label}
                            className={`rounded-md p-3 text-center text-sm font-bold ${step >= index + 1 ? 'bg-primary text-white' : 'bg-white-light text-white-dark dark:bg-dark'}`}
                        >
                            {index + 1}. {label}
                        </div>
                    ))}
                </div>
                {error && <ErrorAlert message={error} />}
                <form className="panel space-y-5" onSubmit={submit}>
                    {step === 1 && (
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Company name" required>
                                <input className="form-input mt-1" required value={form.name} onChange={(event) => update('name', event.target.value)} />
                            </Field>
                            <Field label="Subdomain" required hint="Lowercase tenant identifier; it is also used for the Neon database name">
                                <input className="form-input mt-1" required pattern="[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?" value={form.subdomain} onChange={(event) => update('subdomain', event.target.value.toLowerCase())} />
                            </Field>
                            <Field label="Company type">
                                <input className="form-input mt-1" value={form.companyType} onChange={(event) => update('companyType', event.target.value)} placeholder="Enterprise, developer, agency…" />
                            </Field>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div className={`rounded-md border p-4 ${automaticNeon ? 'border-success/30 bg-success-light text-success' : 'border-warning/30 bg-warning-light text-warning'}`}>
                                <p className="font-bold">
                                    {automaticNeon ? 'Automatic Neon provisioning is ready' : 'Manual Neon connection required'}
                                </p>
                                <p className="mt-1 text-sm">
                                    {automaticNeon
                                        ? 'MaamulPro will create an isolated tenant database, apply its schema over a direct connection, and use a pooled connection at runtime.'
                                        : 'Paste a Neon PostgreSQL connection URL below. MaamulPro will derive the safe pooled and direct connection modes automatically.'}
                                </p>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label="Owner name" required>
                                    <input className="form-input mt-1" required value={form.adminName} onChange={(event) => update('adminName', event.target.value)} />
                                </Field>
                                <Field label="Owner email" required>
                                    <input className="form-input mt-1" type="email" required value={form.adminEmail} onChange={(event) => update('adminEmail', event.target.value)} />
                                </Field>
                                <Field label="Initial password" required hint="At least 10 characters">
                                    <input className="form-input mt-1" type="password" minLength={10} required value={form.adminPassword} onChange={(event) => update('adminPassword', event.target.value)} />
                                </Field>
                                <Field
                                    label={automaticNeon ? 'Neon database URL override' : 'Neon database URL'}
                                    required={!automaticNeon}
                                    hint={automaticNeon ? 'Optional; leave blank to create the tenant database automatically' : 'Credentials are encrypted before storage and never returned by the API'}
                                >
                                    <input
                                        className="form-input mt-1"
                                        type="password"
                                        required={!automaticNeon}
                                        placeholder="postgresql://…neon.tech/database?sslmode=require"
                                        value={form.dbUrl}
                                        onChange={(event) => update('dbUrl', event.target.value)}
                                        autoComplete="off"
                                    />
                                </Field>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div>
                            <h2 className="text-lg font-bold">Assign the subscription plan</h2>
                            <p className="mb-5 text-sm text-white-dark">
                                The selected plan controls modules and quotas. Paid plans create an invoice and remain pending until payment; free plans activate immediately.
                            </p>
                            {!plans.length ? <div className="rounded-md bg-warning-light p-4 text-warning">Create and activate at least one subscription plan before onboarding a company.</div> : <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Subscription plan" required><select className="form-select mt-1" required value={form.planId} onChange={(event) => update('planId', event.target.value)}>{plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name} · ${Number(plan.priceMonthly).toLocaleString()}/mo</option>)}</select></Field>
                                <Field label="Billing cycle" required><select className="form-select mt-1" value={form.billingCycle} onChange={(event) => update('billingCycle', event.target.value)}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></Field>
                                {plans.filter((plan) => plan.id === form.planId).map((plan) => <div className="rounded-md bg-primary-light p-4 text-primary sm:col-span-2" key={plan.id}><p className="font-bold">{plan.name}</p><p className="mt-1 text-sm">{plan.description || 'No plan description.'}</p><p className="mt-2 font-bold">{form.billingCycle === 'YEARLY' ? `$${Number(plan.priceYearly).toLocaleString()} per year` : `$${Number(plan.priceMonthly).toLocaleString()} per month`}</p></div>)}
                            </div>}
                        </div>
                    )}
                    <div className="flex justify-between border-t border-white-light pt-5 dark:border-dark">
                        <button className="btn btn-outline-dark" type="button" disabled={step === 1 || saving} onClick={() => setStep(step - 1)}>Back</button>
                        <button className="btn btn-primary" disabled={saving || (step === 3 && !plans.length)}>
                            {saving ? 'Provisioning Neon database…' : step === 3 ? 'Provision company' : 'Continue'}
                        </button>
                    </div>
                </form>
            </div>
        </AppShell>
    );
};

export default CompanyOnboardingPage;
