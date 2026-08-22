import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState, PageHeader, StatGrid, formatReference, formatTableValue, humanize, money, visibleTableColumns } from '../components/maamulpro/PageKit';
import { api, apiBlob } from '../lib/api';

type ReportWorkspace = 'core' | 'payroll';

type RegistryItem = { id: string; title: string; workspace: string; supportsDateRange?: boolean };

type RunResult = {
    report: RegistryItem;
    generatedAt: string;
    summary: Record<string, number>;
    rows: Record<string, any>[];
    comparison?: { startDate?: string | null; endDate?: string | null; summary: Record<string, number>; summaryDelta: Record<string, number>; rowCount: number };
};

type Props = { basePath?: string; workspace?: ReportWorkspace; initialReportId?: string };

const moneyKey = (key: string) => /(income|expense|profit|balance|budget|salary|deduction|cost|total|paid|net|amount|value|revenue)/i.test(key);

const CoreReportsPage = ({ basePath = '/app/financials/reports', workspace = 'core', initialReportId }: Props) => {
    const [reports, setReports] = useState<RegistryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [compareStartDate, setCompareStartDate] = useState('');
    const [compareEndDate, setCompareEndDate] = useState('');
    const [runningId, setRunningId] = useState('');
    const [result, setResult] = useState<RunResult | null>(null);

    const title = workspace === 'core' ? 'Financial reports' : 'Payroll reports';
    const eyebrow = workspace === 'core' ? 'Unified ledger' : 'Payroll';

    const loadRegistry = async () => {
        setLoading(true);
        setError('');
        try {
            const rows = await api<RegistryItem[]>('/api/reports/registry');
            setReports((Array.isArray(rows) ? rows : []).filter((row) => row.workspace === workspace));
            if (!initialReportId) setLoading(false);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to load reports');
            setLoading(false);
        }
    };

    useEffect(() => { loadRegistry(); }, [workspace]);

    const run = async (reportId: string) => {
        setRunningId(reportId);
        setError('');
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (compareStartDate) params.set('compareStartDate', compareStartDate);
        if (compareEndDate) params.set('compareEndDate', compareEndDate);
        const q = params.toString();
        try {
            const data = await api<RunResult>(`/api/reports/run/${reportId}${q ? `?${q}` : ''}`);
            setResult(data);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to run report');
        } finally {
            setRunningId('');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialReportId) run(initialReportId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const summaryItems = useMemo(
        () => (result ? Object.entries(result.summary || {}).filter(([, value]) => typeof value === 'number').map(([key, value]) => ({ label: humanize(key), value: moneyKey(key) ? money(value) : String(value) })) : []),
        [result],
    );

    const columns = useMemo(() => visibleTableColumns(result?.rows?.[0], [], 10), [result]);

    const download = async (format: 'csv' | 'xls' | 'pdf') => {
        if (!result) return;
        setError('');
        const params = new URLSearchParams({ format });
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        try {
            const blob = await apiBlob(`/api/reports/export/${result.report.id}?${params}`);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${result.report.id}-${new Date().toISOString().slice(0, 10)}.${format}`;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to export report'); }
    };

    const rowTarget = (row: Record<string, any>) => row.transactionId ? `/app/financials?record=${row.transactionId}`
        : row.projectId ? `/app/construction/projects/${row.projectId}`
        : row.propertyId ? `/app/real-estate/properties/${row.propertyId}`
        : row.materialId ? `/app/materials/inventory/manage?record=${row.materialId}`
        : row.payrollId ? `/app/payroll?record=${row.payrollId}` : null;

    const dateFilters = (
        <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-white-dark">
                From
                <input className="form-input mt-1" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-white-dark">
                To
                <input className="form-input mt-1" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-white-dark">
                Compare from
                <input className="form-input mt-1" type="date" value={compareStartDate} onChange={(e) => setCompareStartDate(e.target.value)} />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-white-dark">
                Compare to
                <input className="form-input mt-1" type="date" value={compareEndDate} onChange={(e) => setCompareEndDate(e.target.value)} />
            </label>
            {(startDate || endDate || compareStartDate || compareEndDate) && (
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setStartDate(''); setEndDate(''); setCompareStartDate(''); setCompareEndDate(''); }}>Clear dates</button>
            )}
        </div>
    );

    const renderResult = () => {
        if (!result) return null;
        const rows = result.rows || [];
        return (
            <div className="mt-6 space-y-5">
                {summaryItems.length > 0 && <StatGrid items={summaryItems.slice(0, 4)} />}
                {result.comparison && <div className="panel"><h3 className="mb-3 font-bold">Period comparison</h3><StatGrid items={Object.entries(result.comparison.summaryDelta).slice(0, 4).map(([key, value]) => ({ label: `${humanize(key)} change`, value: `${value > 0 ? '+' : ''}${moneyKey(key) ? money(value) : value}` }))} /></div>}
                <div className="panel overflow-hidden p-0">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white-light px-5 py-4 dark:border-[#191e3a]">
                        <div>
                            <h2 className="text-lg font-bold">{result.report.title}</h2>
                            <p className="text-sm text-white-dark">{rows.length} rows · {new Date(result.generatedAt).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-outline-primary" disabled={Boolean(runningId)} onClick={() => run(result.report.id)}>Run again</button><button type="button" className="btn btn-outline-secondary" onClick={() => download('csv')}>CSV</button><button type="button" className="btn btn-outline-secondary" onClick={() => download('xls')}>Excel</button><button type="button" className="btn btn-outline-secondary" onClick={() => download('pdf')}>PDF</button></div>
                    </div>
                    {!rows.length ? (
                        <EmptyState title="No results" description="Nothing matched the selected date range." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-hover w-full">
                                <thead><tr>{columns.map((column) => <th key={column}>{humanize(column)}</th>)}{rows.some(rowTarget) && <th>Record</th>}</tr></thead>
                                <tbody>{rows.slice(0, 200).map((row, index) => (
                                    <tr key={row.id || index}>{columns.map((column) => {
                                        const value = row[column];
                                        return <td key={column} className={moneyKey(column) && typeof value === 'number' ? 'text-right font-semibold' : ''}>{column === 'reference' ? formatReference(value, row.transactionId) : formatTableValue(column, value)}</td>;
                                    })}{rows.some(rowTarget) && <td>{rowTarget(row) ? <Link className="font-semibold text-primary hover:underline" to={rowTarget(row)!}>Open</Link> : '—'}</td>}</tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AppShell>
            <PageHeader eyebrow={eyebrow} title={title} description="Run company-wide financial or payroll reports with optional date ranges." />
            {dateFilters}
            {error && <ErrorAlert message={error} onRetry={loadRegistry} />}
            {loading ? <div className="panel"><LoadingState /></div> : (
                <>
                    {!reports.length ? (
                        <div className="panel"><EmptyState title="No reports available" description={`No ${workspace === 'core' ? 'financial' : 'payroll'} reports are configured for this workspace.`} /></div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {reports.map((report) => (
                                <div key={report.id} className="panel flex flex-col justify-between gap-4 p-5 transition hover:-translate-y-1 hover:border-primary">
                                    <div>
                                        <h3 className="font-bold text-secondary dark:text-white">{report.title}</h3>
                                        <p className="mt-1 text-sm text-white-dark">{humanize(report.workspace)} report · {report.supportsDateRange ? 'date-range enabled' : 'instant'}</p>
                                    </div>
                                    <button type="button" className="btn btn-primary" disabled={Boolean(runningId)} onClick={() => run(report.id)}>
                                        {runningId === report.id ? 'Running…' : 'Run report'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {renderResult()}
                </>
            )}
        </AppShell>
    );
};

export default CoreReportsPage;
