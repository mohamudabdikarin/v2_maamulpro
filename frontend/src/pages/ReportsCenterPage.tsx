import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { api, sessionStore } from '../lib/api';
import { PageHeader, humanize } from '../components/maamulpro/PageKit';
import { unwrapRows } from '../hooks/useApiData';

type ReportWorkspace = 'core' | 'construction' | 'real_estate' | 'material_management' | 'payroll';
type ReportDefinition = { id: string; title: string; workspace: ReportWorkspace; supportsDateRange: boolean };
type ReportResult = { report: ReportDefinition; generatedAt: string; summary: Record<string, number>; rows: Record<string, any>[] };

const WORKSPACE_LABELS: Record<ReportWorkspace, string> = {
    core: 'Financials',
    construction: 'Construction',
    real_estate: 'Real Estate',
    material_management: 'Materials',
    payroll: 'Payroll',
};

const display = (value: any) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return Array.isArray(value) ? `${value.length} items` : value.name || value.title || 'Details';
    return String(value);
};

type Props = { workspace?: ReportWorkspace; title?: string; defaultReportId?: string };

const ReportsCenterPage = ({ workspace, title = 'Reports Center', defaultReportId }: Props) => {
    const [registry, setRegistry] = useState<ReportDefinition[]>([]);
    const [reportId, setReportId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [projectId, setProjectId] = useState('');
    const [entityId, setEntityId] = useState('');
    const [moduleFilter, setModuleFilter] = useState<ReportWorkspace | 'all'>(workspace || 'all');
    const [result, setResult] = useState<ReportResult | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [entities, setEntities] = useState<Record<string, any>[]>([]);
    const [projects, setProjects] = useState<Record<string, any>[]>([]);
    const reportVisibility = sessionStore.get()?.user.enterpriseConfiguration?.reportVisibility;

    useEffect(() => {
        api<ReportDefinition[]>('/api/reports/registry').then((rows) => {
            setRegistry(rows);
            const allowed = rows.filter((row) => reportVisibility?.[row.id] !== false);
            const visible = workspace ? allowed.filter((row) => row.workspace === workspace) : allowed;
            setReportId(defaultReportId && visible.some((row) => row.id === defaultReportId) ? defaultReportId : visible[0]?.id || '');
        }).catch((reason) => setError(reason.message));
    }, [workspace, defaultReportId]);
    const visibleRegistry = useMemo(() => {
        const allowed = registry.filter((report) => reportVisibility?.[report.id] !== false);
        const activeModule = workspace || moduleFilter;
        return activeModule === 'all' ? allowed : allowed.filter((report) => report.workspace === activeModule);
    }, [registry, workspace, moduleFilter, reportVisibility]);
    useEffect(() => {
        if (!visibleRegistry.some((report) => report.id === reportId)) {
            const defaultReport = defaultReportId && visibleRegistry.some((report) => report.id === defaultReportId) ? defaultReportId : visibleRegistry[0]?.id || '';
            setReportId(defaultReport);
            setResult(null);
        }
    }, [visibleRegistry, reportId, defaultReportId]);
    useEffect(() => {
        const endpoint = workspace === 'construction' ? '/api/construction/projects' : workspace === 'real_estate' ? '/api/real-estate/properties' : workspace === 'material_management' ? '/api/materials/products' : '';
        if (!endpoint) return setEntities([]);
        api<unknown>(endpoint).then((result) => setEntities(unwrapRows(result))).catch(() => setEntities([]));
    }, [workspace]);
    useEffect(() => {
        api<unknown>('/api/construction/projects').then((result) => setProjects(unwrapRows(result))).catch(() => setProjects([]));
    }, []);
    const columns = useMemo(() => Object.keys(result?.rows[0] || {}).filter((key) => !['deletedAt'].includes(key)), [result]);

    const run = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            if (projectId) params.set('projectId', projectId);
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
        <PageHeader title={title} actions={result && <div className="flex gap-2 print:hidden"><button className="btn btn-outline-primary" onClick={exportCsv}>Export CSV</button><button className="btn btn-outline-dark" onClick={() => window.print()}>Print</button></div>} />
        {error && <div className="mb-5 rounded-md bg-danger-light p-4 text-danger">{error}</div>}

        {/* Filter Bar at the top of the page */}
        <div className="panel mb-6 print:hidden">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {!workspace && <div><label className="text-xs font-bold uppercase text-white-dark">Module</label><select className="form-select mt-1" value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value as ReportWorkspace | 'all'); setResult(null); }}><option value="all">All modules</option>{Object.entries(WORKSPACE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
                <div className={workspace ? 'sm:col-span-2' : ''}><label className="text-xs font-bold uppercase text-white-dark">Report</label><select className="form-select mt-1" value={reportId} onChange={(e) => setReportId(e.target.value)}>{Object.entries(WORKSPACE_LABELS).map(([module, label]) => {
                    const reportsForModule = visibleRegistry.filter((report) => report.workspace === module);
                    return reportsForModule.length ? <optgroup key={module} label={label}>{reportsForModule.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}</optgroup> : null;
                })}</select></div>
                <div><label className="text-xs font-bold uppercase text-white-dark">Start date</label><input className="form-input mt-1" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div><label className="text-xs font-bold uppercase text-white-dark">End date</label><input className="form-input mt-1" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                <div><label className="text-xs font-bold uppercase text-white-dark">Project (optional)</label>{projects.length ? <select className="form-select mt-1" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">All projects</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name || project.id}</option>)}</select> : <input className="form-input mt-1" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Project ID" />}</div>
                {(workspace === 'real_estate' || workspace === 'material_management') && <div><label className="text-xs font-bold uppercase text-white-dark">{workspace === 'real_estate' ? 'Property' : 'Material'} (optional)</label>{entities.length ? <select className="form-select mt-1" value={entityId} onChange={(e) => setEntityId(e.target.value)}><option value="">All</option>{entities.map((entity) => <option value={entity.id} key={entity.id}>{entity.name || entity.title || entity.id}</option>)}</select> : <input className="form-input mt-1" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="All" />}</div>}
            </div>
            <button className="btn btn-primary mt-4 w-full" disabled={!reportId || loading} onClick={run}>{loading ? 'Generating report…' : 'Run report'}</button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">{visibleRegistry.map((report) => <button className={`panel text-left transition hover:-translate-y-0.5 hover:border-primary ${reportId === report.id ? 'border-primary ring-1 ring-primary' : ''}`} onClick={() => { setReportId(report.id); setResult(null); }} key={report.id}><span className="text-xs font-bold uppercase tracking-wide text-primary">{WORKSPACE_LABELS[report.workspace]}</span><h3 className="mt-2 font-bold">{report.title}</h3><p className="mt-1 text-xs text-white-dark">Project filters · CSV · Print</p></button>)}</div>

        {result && <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">{result.report.title}</h2><p className="text-sm text-white-dark">Generated {new Date(result.generatedAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2">{Object.entries(result.summary).map(([key, value]) => <span className="badge bg-primary" key={key}>{humanize(key)}: {Number(value).toLocaleString()}</span>)}</div></div>
            <div className="panel overflow-x-auto p-0">{!result.rows.length ? <div className="p-10 text-center text-white-dark">No data matched these filters.</div> : <table className="table-hover w-full"><thead><tr>{columns.map((column) => <th key={column}>{column.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={row.id || index}>{columns.map((column) => <td key={column}>{display(row[column])}</td>)}</tr>)}</tbody></table>}</div>
        </div>}
    </AppShell>;
};

export default ReportsCenterPage;
