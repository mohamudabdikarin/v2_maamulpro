import { useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { ErrorAlert, LoadingState, PageHeader, StatGrid, money } from '../components/maamulpro/PageKit';
import { useApiData } from '../hooks/useApiData';
import { sessionStore } from '../lib/api';

type Analytics = {
    totals: { totalIncome: number; totalExpense: number; netProfit: number; transactionCount: number };
    series: { label: string; income: number; expense: number; net: number }[];
    distribution: { label: string; value: number; color: string }[];
};

const AnalyticsPage = () => {
    const [period, setPeriod] = useState('monthly');
    const [workspace, setWorkspace] = useState('all');
    const features = sessionStore.get()?.user.entitlements?.features;
    const state = useApiData<Analytics>(`/api/dashboard/analytics?period=${period}&workspace=${workspace}`, { totals: { totalIncome: 0, totalExpense: 0, netProfit: 0, transactionCount: 0 }, series: [], distribution: [] });
    const maximum = Math.max(1, ...state.data.series.flatMap((point) => [point.income, point.expense]));
    return <AppShell>
        <PageHeader eyebrow="Decision intelligence" title="Analytics Center" description="Compare financial movement and operational distribution across enabled workspaces." actions={<>
            <select className="form-select w-40" value={workspace} onChange={(event) => setWorkspace(event.target.value)}><option value="all">All workspaces</option>{features?.construction && <option value="construction">Construction</option>}{features?.realEstate && <option value="real_estate">Real estate</option>}{features?.materials && <option value="material_management">Materials</option>}</select>
            <select className="form-select w-36" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="weekly">7 days</option><option value="monthly">This month</option><option value="yearly">This year</option></select>
        </>} />
        {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}
        {state.loading ? <div className="panel"><LoadingState /></div> : <>
            <StatGrid items={[
                { label: 'Income', value: money(state.data.totals.totalIncome), tone: 'success' },
                { label: 'Expenses', value: money(state.data.totals.totalExpense), tone: 'danger' },
                { label: 'Net profit', value: money(state.data.totals.netProfit), tone: state.data.totals.netProfit >= 0 ? 'primary' : 'danger' },
                { label: 'Transactions', value: state.data.totals.transactionCount.toLocaleString() },
            ]} />
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="panel xl:col-span-2"><h2 className="mb-5 text-lg font-bold">Income and expenses</h2><div className="flex h-72 items-end gap-2 overflow-x-auto border-b border-white-light pb-2 dark:border-[#191e3a]">{state.data.series.map((point) => <div className="flex min-w-12 flex-1 flex-col items-center" key={point.label}><div className="flex h-56 items-end gap-1"><div title={money(point.income)} className="w-4 rounded-t bg-success" style={{ height: `${Math.max(2, point.income / maximum * 100)}%` }} /><div title={money(point.expense)} className="w-4 rounded-t bg-danger" style={{ height: `${Math.max(2, point.expense / maximum * 100)}%` }} /></div><span className="mt-2 text-xs text-white-dark">{point.label}</span></div>)}</div><div className="mt-4 flex gap-5 text-xs"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-success" />Income</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-danger" />Expense</span></div></div>
                <div className="panel"><h2 className="mb-5 text-lg font-bold">Operational distribution</h2><div className="space-y-5">{state.data.distribution.map((item) => { const total = state.data.distribution.reduce((sum, row) => sum + row.value, 0); return <div key={item.label}><div className="mb-2 flex justify-between"><span>{item.label}</span><strong>{item.value}</strong></div><div className="h-2 rounded-full bg-gray-200 dark:bg-dark"><div className="h-2 rounded-full" style={{ width: `${item.value / Math.max(total, 1) * 100}%`, background: item.color }} /></div></div>; })}</div></div>
            </div>
        </>}
    </AppShell>;
};

export default AnalyticsPage;
