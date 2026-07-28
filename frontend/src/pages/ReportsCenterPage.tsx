import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { api } from '../lib/api';
import { PageHeader, humanize } from '../components/maamulpro/PageKit';
import { unwrapRows } from '../hooks/useApiData';

type ReportDefinition = { id: string; title: string; workspace: string; supportsDateRange: boolean };
type ReportResult = { report: ReportDefinition; generatedAt: string; summary: { rowCount: number }; rows: Record<string, any>[] };

const display = (value: any) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return Array.isArray(value) ? `${value.length} items` : value.name || value.title || 'Details';
    return String(value);
};

type Props = { workspace?: 'core' | 'construction' | 'real_estate' | 'material_management' | 'payroll'; title?: string; defaultReportId?: string };

const ReportsCenterPage = ({ workspace, title = 'Reports Center', defaultReportId }: Props) => {
    const [registry, setRegistry] = useState<ReportDefinition[]>([]);
    const [reportId, setReportId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [entityId, setEntityId] = useState('');
    const [result, setResult] = useState<ReportResult | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [entities, setEntities] = useState<Record<string, any>[]>([]);

    useEffect(() => {
        api<ReportDefinition[]>('/api/reports/registry').then((rows) => {
            setRegistry(rows);
            const visible = workspace ? rows.filter((row) => row.workspace === workspace) : rows;
            setReportId(defaultReportId && visible.some((row) => row.id === defaultReportId) ? defaultReportId : visible[0]?.id || '');
        }).catch((reason) => setError(reason.message));
    }, [workspace, defaultReportId]);
    const visibleRegistry = useMemo(() => workspace ? registry.filter((report) => report.workspace === workspace) : registry, [registry, workspace]);
    useEffect(() => {
        const endpoint = workspace === 'construction' ? '/api/construction/projects' : workspace === 'real_estate' ? '/api/real-estate/properties' : workspace === 'material_management' ? '/api/materials/products' : '';
        if (!endpoint) return setEntities([]);
        api<unknown>(endpoint).then((result) => setEntities(unwrapRows(result))).catch(() => setEntities([]));
    }, [workspace]);
    const columns = useMemo(() => Object.keys(result?.rows[0] || {}).filter((key) => !['deletedAt'].includes(key)).slice(0, 10), [result]);

    const run = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            if (entityId) params.set('entityId', entityId);
            setResult(await api<ReportResult>(`/api/reports/run/${reportId}?${params}`));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to run report');
        } finally {
            setLoading(false);
        }
    };
    const exportCsv = () => {
        if (!result) return;
        const quote = (value: any) => `"${display(value).replace(/"/g, '""')}"`;
        const csv = [columns.map(quote).join(','), ...result.rows.map((row) => columns.map((column) => quote(row[column])).join(','))].join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${result.report.id}-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return <AppShell>
        <PageHeader eyebrow={workspace ? `${humanize(workspace)} reporting` : 'Cross-module reporting'} title={title} description="Run, filter, preview, print and export live reports." actions={result && <div className="flex gap-2 print:hidden"><button className="btn btn-outline-primary" onClick={exportCsv}>Export CSV</button><button className="btn btn-outline-dark" onClick={() => window.print()}>Print</button></div>} />
        {error && <div className="mb-5 rounded-md bg-danger-light p-4 text-danger">{error}</div>}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">{visibleRegistry.map((report) => <button className={`panel text-left transition hover:-translate-y-0.5 hover:border-primary ${reportId === report.id ? 'border-primary ring-1 ring-primary' : ''}`} onClick={() => { setReportId(report.id); setResult(null); }} key={report.id}><span className="text-xs font-bold uppercase tracking-wide text-primary">{humanize(report.workspace)}</span><h3 className="mt-2 font-bold">{report.title}</h3><p className="mt-1 text-xs text-white-dark">Date filters · CSV · Print</p></button>)}</div>
        <div className="panel mb-6 grid gap-4 print:hidden md:grid-cols-5">
            <div className="md:col-span-2"><label>Report</label><select className="form-select mt-1" value={reportId} onChange={(e) => setReportId(e.target.value)}>{visibleRegistry.map((report) => <option key={report.id} value={report.id}>{report.title} · {report.workspace.replace(/_/g, ' ')}</option>)}</select></div>
            <div><label>Start date</label><input className="form-input mt-1" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><label>End date</label><input className="form-input mt-1" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <div><label>{workspace === 'construction' ? 'Project' : workspace === 'real_estate' ? 'Property' : workspace === 'material_management' ? 'Material' : 'Scope'} (optional)</label>{entities.length ? <select className="form-select mt-1" value={entityId} onChange={(e) => setEntityId(e.target.value)}><option value="">All</option>{entities.map((entity) => <option value={entity.id} key={entity.id}>{entity.name || entity.title || entity.id}</option>)}</select> : <input className="form-input mt-1" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="All" />}</div>
            <button className="btn btn-primary md:col-span-5" disabled={!reportId || loading} onClick={run}>{loading ? 'Generating…' : 'Run report'}</button>
        </div>
        {result && <div>
            <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold">{result.report.title}</h2><p className="text-sm text-white-dark">Generated {new Date(result.generatedAt).toLocaleString()}</p></div><span className="badge bg-primary">{result.summary.rowCount} rows</span></div>
            <div className="panel overflow-x-auto p-0">{!result.rows.length ? <div className="p-10 text-center text-white-dark">No data matched these filters.</div> : <table className="table-hover w-full"><thead><tr>{columns.map((column) => <th key={column}>{column.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={row.id || index}>{columns.map((column) => <td key={column}>{display(row[column])}</td>)}</tr>)}</tbody></table>}</div>
        </div>}
    </AppShell>;
};

export default ReportsCenterPage;
