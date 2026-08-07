import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState, PageHeader, StatGrid, StatusPill, money, shortDate } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';
import { unwrapRows } from '../hooks/useApiData';

const RentalHubPage = () => {
    const [data, setData] = useState<{ tenants: any[]; contracts: any[]; payments: any[] } | null>(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [generating, setGenerating] = useState(false);

    const load = () => Promise.all([api<unknown>('/api/real-estate/tenants'), api<unknown>('/api/real-estate/rental-contracts'), api<unknown>('/api/real-estate/rent-payments')]).then(([a, b, c]) => setData({ tenants: unwrapRows(a), contracts: unwrapRows(b), payments: unwrapRows(c) })).catch((reason) => setError(reason.message));
    useEffect(() => { load(); }, []);

    const generateInvoices = async () => {
        setGenerating(true);
        setError('');
        setMessage('');
        try {
            const res = await api<{ message: string }>('/api/real-estate/generate-rent-invoices', { method: 'POST' });
            setMessage(res.message);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate monthly invoices');
        } finally {
            setGenerating(false);
        }
    };

    return <AppShell>
        <PageHeader eyebrow="Rental management" title="Rentals" description="Tenants, leases, renewals, payment obligations and collections in one workspace." actions={<>
            <button className="btn btn-outline-success" disabled={generating} onClick={generateInvoices}>{generating ? 'Generating…' : 'Generate monthly invoices'}</button>
            <Link className="btn btn-outline-primary" to="/app/real-estate/tenants">Manage tenants</Link>
            <Link className="btn btn-outline-primary" to="/app/real-estate/rent-payments">Rent payments</Link>
            <Link className="btn btn-primary" to="/app/real-estate/rental-contracts/new">New lease</Link>
        </>} />
        {message && <div className="mb-5 rounded-md bg-success-light p-4 text-sm font-semibold text-success">{message}</div>}
        {error && <ErrorAlert message={error} onRetry={load} />}{!data ? <div className="panel"><LoadingState /></div> : <><StatGrid items={[
            { label: 'Tenants', value: data.tenants.length }, { label: 'Active leases', value: data.contracts.filter((row) => row.status === 'ACTIVE').length, tone: 'success' },
            { label: 'Monthly contracted', value: money(data.contracts.filter((row) => row.status === 'ACTIVE').reduce((sum, row) => sum + Number(row.monthlyRent || 0), 0)), tone: 'info' },
            { label: 'Late / unpaid', value: data.payments.filter((row) => ['LATE', 'UNPAID'].includes(row.status)).length, tone: 'danger' },
        ]} /><div className="grid gap-6 xl:grid-cols-2"><div className="panel overflow-hidden p-0"><div className="flex justify-between p-5"><h2 className="text-lg font-bold">Lease register</h2><Link className="text-primary" to="/app/real-estate/rental-contracts">Manage</Link></div>{!data.contracts.length ? <EmptyState title="No rental contracts" /> : <div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Tenant</th><th>Property</th><th>Monthly rent</th><th>Ends</th><th>Status</th></tr></thead><tbody>{data.contracts.slice(0, 12).map((row) => <tr key={row.id}><td>{row.tenant?.name}</td><td>{row.property?.title}</td><td>{money(row.monthlyRent)}</td><td>{shortDate(row.endDate)}</td><td><StatusPill value={row.status} /></td></tr>)}</tbody></table></div>}</div><div className="panel overflow-hidden p-0"><div className="flex justify-between p-5"><h2 className="text-lg font-bold">Payment obligations</h2><Link className="text-primary" to="/app/real-estate/rent-payments">Manage</Link></div>{!data.payments.length ? <EmptyState title="No rent payments" /> : <div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Tenant</th><th>Due</th><th>Paid</th><th>Status</th></tr></thead><tbody>{data.payments.slice(0, 12).map((row) => <tr key={row.id}><td>{row.tenant?.name}</td><td>{money(row.amountDue)}</td><td>{money(row.amountPaid)}</td><td><StatusPill value={row.status} /></td></tr>)}</tbody></table></div>}</div></div></>}
    </AppShell>;
};

export default RentalHubPage;
