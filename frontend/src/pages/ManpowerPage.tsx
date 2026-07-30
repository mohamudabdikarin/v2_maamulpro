import { useEffect, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState, PageHeader, StatGrid, money, shortDate } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';

type Dashboard = { workers: any[]; workerTypes: any[]; expenses: any[]; ledger: any[]; summary: { workerCount: number; expenseCount: number; totalExpenses: number } };

const ManpowerPage = () => {
    const [data, setData] = useState<Dashboard | null>(null); const [projects, setProjects] = useState<any[]>([]); const [projectId, setProjectId] = useState(''); const [error, setError] = useState('');
    const load = () => { setError(''); Promise.all([api<Dashboard>(`/api/construction/manpower${projectId ? `?projectId=${projectId}` : ''}`), api<any>('/api/construction/projects')]).then(([dashboard, rows]) => { setData(dashboard); setProjects(Array.isArray(rows) ? rows : rows.data || []); }).catch((reason) => setError(reason.message)); };
    useEffect(load, [projectId]);
    return <AppShell>
        <PageHeader eyebrow="Construction workforce" title="Manpower dashboard" description="Worker assignments, labor classifications, operational costs and ledger activity." actions={<select className="form-select w-64" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">All projects</option>{projects.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>} />
        {error && <ErrorAlert message={error} onRetry={load} />}
        {!data ? <div className="panel"><LoadingState /></div> : <>
            <StatGrid items={[
                { label: 'Construction workers', value: data.summary.workerCount },
                { label: 'Worker types', value: data.workerTypes.length, tone: 'info' },
                { label: 'Expense entries', value: data.summary.expenseCount, tone: 'warning' },
                { label: 'Labor/site expenses', value: money(data.summary.totalExpenses), tone: 'danger' },
            ]} />
            <div className="grid gap-6 xl:grid-cols-2">
                <div className="panel overflow-hidden p-0"><div className="p-5"><h2 className="text-lg font-bold">Workforce</h2><p className="text-sm text-white-dark">Current construction staff and assignments</p></div>{!data.workers.length ? <EmptyState title="No construction workers" /> : <div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Name</th><th>Position</th><th>Type</th><th>Project</th></tr></thead><tbody>{data.workers.map((worker) => <tr key={worker.id}><td><strong>{worker.firstName} {worker.lastName}</strong><p className="text-xs text-white-dark">{worker.phone || worker.email || ''}</p></td><td>{worker.position || '—'}</td><td>{worker.workerType?.name || 'Unclassified'}</td><td>{worker.assignedProject?.name || '—'}</td></tr>)}</tbody></table></div>}</div>
                <div className="panel overflow-hidden p-0"><div className="p-5"><h2 className="text-lg font-bold">Latest expenses</h2><p className="text-sm text-white-dark">Site and labor operational costs</p></div>{!data.expenses.length ? <EmptyState title="No expenses recorded" /> : <div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Date</th><th>Description</th><th>Project</th><th>Amount</th></tr></thead><tbody>{data.expenses.slice(0, 12).map((row) => <tr key={row.id}><td>{shortDate(row.date)}</td><td>{row.description}</td><td>{row.project?.name || 'General'}</td><td className="font-bold text-danger">{money(row.amount)}</td></tr>)}</tbody></table></div>}</div>
            </div>
            <div className="panel mt-6 overflow-hidden p-0"><div className="p-5"><h2 className="text-lg font-bold">Worker ledger</h2><p className="text-sm text-white-dark">Latest labor income and expense entries</p></div>{!data.ledger.length ? <EmptyState title="No worker ledger activity" /> : <div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Date</th><th>Worker</th><th>Project</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead><tbody>{data.ledger.slice(0, 20).map((row) => <tr key={row.id}><td>{shortDate(row.date)}</td><td>{row.staff ? `${row.staff.firstName} ${row.staff.lastName}` : 'General'}</td><td>{row.project?.name || 'General'}</td><td>{row.description}</td><td><span className={`badge ${row.type === 'INCOME' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>{row.type}</span></td><td>{money(row.amount)}</td></tr>)}</tbody></table></div>}</div>
        </>}
    </AppShell>;
};

export default ManpowerPage;
