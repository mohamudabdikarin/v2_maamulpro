import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState, formatDescription, money, shortDate, StatusPill } from '../components/maamulpro/PageKit';
import { api, sessionStore } from '../lib/api';

type ReportWorkspace = 'construction' | 'real_estate' | 'material_management' | 'payroll' | 'core';

type EntityCard = {
    id: string;
    name: string;
    location?: string | null;
    status: string;
    budget: number;
    spentToDate: number;
    budgetUsedPct: number;
    progress: number;
    startDate?: string | null;
    manager?: string | null;
    assignees?: string[];
    type?: string;
    meta?: string;
};

type OverviewLine = { code: string; label: string; amount: number; filterKey: string };
type OverviewSection = { code: string; category: string; label: string; lines: OverviewLine[]; total: number };
type Overview = {
    project: { id: string; name: string; location?: string | null; status: string; budget: number; progress: number; startDate?: string | null; manager?: string | null; type?: string };
    period: { from: string | null; to: string | null };
    income: { code: string; label: string; amount: number };
    sections: OverviewSection[];
    totalExpense: number;
    netIncome: number;
    generatedAt: string;
};

type LedgerRow = Record<string, any> & { id: string; amount: number; date: string; enteredBy?: string };
type Ledger = { project: { id: string; name: string }; category: string; label: string; filter: string | null; filterLabel?: string | null; total: number; rows: LedgerRow[] };
type Detail = {
    project: { id: string; name: string; location?: string | null; status: string; manager?: string | null };
    category: string;
    label: string;
    transaction: LedgerRow;
    generatedAt: string;
};

type WorkspaceConfig = {
    apiRoot: string;
    entitySingular: string;
    entityPlural: string;
    selectTitle: string;
    selectSub: string;
    overviewEyebrow: string;
    emptyTitle: string;
    emptyActionTo?: string;
    emptyActionLabel?: string;
    budgetLabel: string;
    categories: Record<string, { label: string; desc: string }>;
    primaryCol: (cat: string) => string;
    secondaryCol: (cat: string) => string;
    primaryValue: (cat: string, row: LedgerRow) => string;
    secondaryValue: (cat: string, row: LedgerRow) => string;
};

const WORKSPACES: Record<ReportWorkspace, WorkspaceConfig> = {
    construction: {
        apiRoot: '/api/reports/projects',
        entitySingular: 'project',
        entityPlural: 'projects',
        selectTitle: 'Select a project',
        selectSub: 'Open a construction project to review manpower, materials and site expenses.',
        overviewEyebrow: 'Project overview',
        emptyTitle: 'No projects',
        emptyActionTo: '/app/construction/projects/new',
        emptyActionLabel: 'New project',
        budgetLabel: 'budget',
        categories: {
            manpower: { label: 'Manpower', desc: 'Worker ledger costs for this project' },
            materials: { label: 'Materials', desc: 'Material usage charged to this project' },
            expenses: { label: 'Site Expenses', desc: 'Daily operational expenses on site' },
        },
        primaryCol: (cat) => (cat === 'materials' ? 'Item' : cat === 'manpower' ? 'Worker' : 'Description'),
        secondaryCol: (cat) => (cat === 'materials' ? 'Used by' : 'Category'),
        primaryValue: (cat, row) => (cat === 'materials' ? row.item : cat === 'manpower' ? row.worker : row.description) || '—',
        secondaryValue: (cat, row) => (cat === 'materials' ? (row.usedBy || row.enteredBy) : cat === 'manpower' ? (row.rollupKey || row.description) : row.expenseCategory) || '—',
    },
    real_estate: {
        apiRoot: '/api/reports/properties',
        entitySingular: 'property',
        entityPlural: 'properties',
        selectTitle: 'Select a property',
        selectSub: 'Open a property to review rent payments, sales and lease contracts.',
        overviewEyebrow: 'Property overview',
        emptyTitle: 'No properties',
        emptyActionTo: '/app/real-estate/properties/new',
        emptyActionLabel: 'Add property',
        budgetLabel: 'list price',
        categories: {
            rentals: { label: 'Rent Payments', desc: 'Tenant rent collection for this property' },
            sales: { label: 'Property Sales', desc: 'Sale deals linked to this property' },
            contracts: { label: 'Lease Contracts', desc: 'Active and historical leases' },
        },
        primaryCol: () => 'Party',
        secondaryCol: () => 'Status',
        primaryValue: (_cat, row) => row.worker || row.description || '—',
        secondaryValue: (_cat, row) => row.status || row.role || row.expenseCategory || '—',
    },
    material_management: {
        apiRoot: '/api/reports/materials',
        entitySingular: 'material',
        entityPlural: 'materials',
        selectTitle: 'Select a material',
        selectSub: 'Open a material to review stock movements, purchases and sales.',
        overviewEyebrow: 'Material overview',
        emptyTitle: 'No materials',
        emptyActionTo: '/app/materials/inventory/manage/new',
        emptyActionLabel: 'Add material',
        budgetLabel: 'stock value',
        categories: {
            movements: { label: 'Stock Movements', desc: 'Receipts, usage and adjustments' },
            purchases: { label: 'Purchases', desc: 'Purchase order lines for this material' },
            sales: { label: 'Sales', desc: 'Customer sales of this material' },
        },
        primaryCol: (cat) => (cat === 'movements' ? 'Project / note' : cat === 'purchases' ? 'Supplier' : 'Customer'),
        secondaryCol: (cat) => (cat === 'movements' ? 'Type' : 'Reference'),
        primaryValue: (cat, row) => (cat === 'movements' ? (row.worker || row.description) : row.worker) || '—',
        secondaryValue: (cat, row) => (cat === 'movements' ? row.status || row.role : row.description || row.status) || '—',
    },
    payroll: {
        apiRoot: '/api/reports/projects',
        entitySingular: 'project',
        entityPlural: 'projects',
        selectTitle: 'Select a project',
        selectSub: 'Review project-linked labor and cost activity for payroll context.',
        overviewEyebrow: 'Project overview',
        emptyTitle: 'No projects',
        emptyActionTo: '/app/construction/projects/new',
        emptyActionLabel: 'New project',
        budgetLabel: 'budget',
        categories: {
            manpower: { label: 'Manpower', desc: 'Worker ledger costs for this project' },
            materials: { label: 'Materials', desc: 'Material usage charged to this project' },
            expenses: { label: 'Site Expenses', desc: 'Daily operational expenses on site' },
        },
        primaryCol: (cat) => (cat === 'materials' ? 'Item' : cat === 'manpower' ? 'Worker' : 'Description'),
        secondaryCol: (cat) => (cat === 'materials' ? 'Used by' : 'Category'),
        primaryValue: (cat, row) => (cat === 'materials' ? row.item : cat === 'manpower' ? row.worker : row.description) || '—',
        secondaryValue: (cat, row) => (cat === 'materials' ? (row.usedBy || row.enteredBy) : cat === 'manpower' ? (row.rollupKey || row.description) : row.expenseCategory) || '—',
    },
    core: {
        apiRoot: '/api/reports/projects',
        entitySingular: 'project',
        entityPlural: 'projects',
        selectTitle: 'Select a project',
        selectSub: 'Open a project profit & loss with drill-down into cost categories.',
        overviewEyebrow: 'Project overview',
        emptyTitle: 'No projects',
        emptyActionTo: '/app/construction/projects/new',
        emptyActionLabel: 'New project',
        budgetLabel: 'budget',
        categories: {
            manpower: { label: 'Manpower', desc: 'Worker ledger costs for this project' },
            materials: { label: 'Materials', desc: 'Material usage charged to this project' },
            expenses: { label: 'Site Expenses', desc: 'Daily operational expenses on site' },
        },
        primaryCol: (cat) => (cat === 'materials' ? 'Item' : cat === 'manpower' ? 'Worker' : 'Description'),
        secondaryCol: (cat) => (cat === 'materials' ? 'Used by' : 'Category'),
        primaryValue: (cat, row) => (cat === 'materials' ? row.item : cat === 'manpower' ? row.worker : row.description) || '—',
        secondaryValue: (cat, row) => (cat === 'materials' ? (row.usedBy || row.enteredBy) : cat === 'manpower' ? (row.rollupKey || row.description) : row.expenseCategory) || '—',
    },
};

const Crumb = ({ label, active, done, to }: { label: string; active?: boolean; done?: boolean; to?: string }) => {
    const className = `inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition ${
        active
            ? 'border-primary/50 bg-primary text-white shadow-sm'
            : done
              ? 'cursor-pointer border-primary/25 bg-primary/10 text-primary hover:bg-primary/20'
              : 'border-dashed border-secondary/20 bg-white/40 text-white-dark dark:bg-white/5'
    }`;
    if (done && to) return <Link className={className} to={to}>{label}</Link>;
    return <span className={className}>{label}</span>;
};

const amountClass = 'font-mono font-semibold tabular-nums';

type Props = { basePath?: string; workspace?: ReportWorkspace };

const ProjectReportsPage = ({ basePath = '/app/construction/reports', workspace = 'construction' }: Props) => {
    const cfg = WORKSPACES[workspace] || WORKSPACES.construction;
    const navigate = useNavigate();
    const { projectId: entityId, category: categoryParam, txnId } = useParams<{ projectId?: string; category?: string; txnId?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const category = categoryParam && cfg.categories[categoryParam] ? categoryParam : undefined;
    const filter = searchParams.get('filter') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const [entities, setEntities] = useState<EntityCard[]>([]);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [ledger, setLedger] = useState<Ledger | null>(null);
    const [detail, setDetail] = useState<Detail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const view = !entityId ? 'home' : !category ? 'overview' : !txnId ? 'category' : 'detail';
    const sessionUser = sessionStore.get()?.user;
    const generatedBy = sessionUser?.name || sessionUser?.email || 'User';

    const querySuffix = useMemo(() => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (filter && view === 'category') params.set('filter', filter);
        const q = params.toString();
        return q ? `?${q}` : '';
    }, [startDate, endDate, filter, view]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                if (view === 'home') {
                    const rows = await api<EntityCard[]>(cfg.apiRoot);
                    if (!cancelled) {
                        setEntities(Array.isArray(rows) ? rows : []);
                        setOverview(null);
                        setLedger(null);
                        setDetail(null);
                    }
                    return;
                }
                if (view === 'overview' && entityId) {
                    const data = await api<Overview>(`${cfg.apiRoot}/${entityId}/overview${querySuffix}`);
                    if (!cancelled) {
                        setOverview(data);
                        setLedger(null);
                        setDetail(null);
                    }
                    return;
                }
                if (view === 'category' && entityId && category) {
                    const data = await api<Ledger>(`${cfg.apiRoot}/${entityId}/${category}${querySuffix}`);
                    if (!cancelled) {
                        setLedger(data);
                        setDetail(null);
                    }
                    return;
                }
                if (view === 'detail' && entityId && category && txnId) {
                    const data = await api<Detail>(`${cfg.apiRoot}/${entityId}/${category}/${txnId}`);
                    if (!cancelled) setDetail(data);
                }
            } catch (reason) {
                if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load report');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [view, entityId, category, txnId, querySuffix, cfg.apiRoot, workspace]);

    const base = basePath.replace(/\/$/, '');
    const entityName = overview?.project.name || ledger?.project.name || detail?.project.name || entities.find((p) => p.id === entityId)?.name || cfg.entitySingular;

    const printNow = () => window.print();

    const setDateRange = (nextStart: string, nextEnd: string) => {
        const params = new URLSearchParams(searchParams);
        if (nextStart) params.set('startDate', nextStart); else params.delete('startDate');
        if (nextEnd) params.set('endDate', nextEnd); else params.delete('endDate');
        setSearchParams(params, { replace: true });
    };

    const clearFilter = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('filter');
        setSearchParams(params);
    };

    const openCategory = (cat: string, filterKey?: string | null) => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (filterKey) params.set('filter', filterKey);
        const q = params.toString();
        navigate(`${base}/${entityId}/${cat}${q ? `?${q}` : ''}`);
    };

    const stepper = (
        <div className="print:hidden mb-6 flex flex-wrap items-center gap-1.5 rounded-xl border border-secondary/10 bg-secondary/10 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <Crumb label="Reports" done to={base} />
            <span className="text-white-dark/50">›</span>
            {entityId ? (
                <>
                    <Crumb label={entityName} done to={`${base}/${entityId}`} />
                    <span className="text-white-dark/50">›</span>
                    <Crumb label="Overview" active={view === 'overview'} done={view === 'category' || view === 'detail'} to={`${base}/${entityId}`} />
                </>
            ) : (
                <>
                    <Crumb label={`Select ${cfg.entitySingular}`} active />
                    <span className="text-white-dark/50">›</span>
                    <Crumb label="Overview" />
                </>
            )}
            <span className="text-white-dark/50">›</span>
            {category ? (
                <Crumb label={cfg.categories[category].label} active={view === 'category'} done={view === 'detail'} to={`${base}/${entityId}/${category}`} />
            ) : (
                <Crumb label="Select item" />
            )}
            <span className="text-white-dark/50">›</span>
            <Crumb label="Full details" active={view === 'detail'} />
        </div>
    );

    const dateFilters = view !== 'home' && view !== 'detail' ? (
        <div className="print:hidden mb-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-white-dark">
                From
                <input className="form-input mt-1" type="date" value={startDate} onChange={(e) => setDateRange(e.target.value, endDate)} />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-white-dark">
                To
                <input className="form-input mt-1" type="date" value={endDate} onChange={(e) => setDateRange(startDate, e.target.value)} />
            </label>
            {(startDate || endDate) && (
                <button type="button" className="btn btn-outline-secondary" onClick={() => setDateRange('', '')}>Clear dates</button>
            )}
        </div>
    ) : null;

    const renderHome = () => (
        <div>
            <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Reports</div>
                <h1 className="mt-1 text-2xl font-extrabold text-secondary dark:text-white sm:text-3xl">{cfg.selectTitle}</h1>
                <p className="mt-2 text-sm text-white-dark">{cfg.selectSub}</p>
            </div>
            {!entities.length ? (
                <div className="panel">
                    <EmptyState
                        title={cfg.emptyTitle}
                        description={`Create ${cfg.entityPlural} to begin tracking reports.`}
                        action={cfg.emptyActionTo ? <Link className="btn btn-primary" to={cfg.emptyActionTo}>{cfg.emptyActionLabel}</Link> : undefined}
                    />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {entities.map((entity) => {
                        const pct = Math.min(100, entity.budgetUsedPct || 0);
                        const over = (entity.budgetUsedPct || 0) > 95;
                        return (
                            <button
                                key={entity.id}
                                type="button"
                                className="panel text-left transition hover:-translate-y-1 hover:border-primary"
                                onClick={() => navigate(`${base}/${entity.id}`)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold text-secondary dark:text-white">{entity.name}</h2>
                                        <p className="mt-1 text-sm text-white-dark">{entity.location || entity.meta || '—'}</p>
                                    </div>
                                    <StatusPill value={entity.status} />
                                </div>
                                {(entity.type || entity.meta) && workspace !== 'construction' && (
                                    <span className="mt-3 inline-block rounded-md bg-white-light px-2 py-0.5 text-xs text-white-dark dark:bg-dark">{entity.type || entity.meta}</span>
                                )}
                                {workspace === 'construction' && (
                                    <div className="mt-4">
                                        <div className="mb-1 flex justify-between text-xs text-white-dark">
                                            <span>Budget used</span>
                                            <span className={amountClass}>{entity.budgetUsedPct || 0}%</span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-white-light dark:bg-dark">
                                            <div className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4 flex items-center justify-between border-t border-white-light pt-3 text-xs text-white-dark dark:border-dark">
                                    <span>{entity.manager || entity.assignees?.[0] || '—'}</span>
                                    <span className={amountClass}>{money(entity.budget)} {cfg.budgetLabel}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const PlRow = ({
        code, label, amount, level = 0, bold, grand, clickable, onClick,
    }: {
        code?: string; label: string; amount?: number | null; level?: number; bold?: boolean; grand?: boolean; clickable?: boolean; onClick?: () => void;
    }) => (
        <div
            className={`flex items-baseline justify-between gap-3 py-1 text-[13px] ${bold || grand ? 'font-bold' : ''} ${clickable ? 'cursor-pointer rounded-md hover:bg-primary/10' : ''}`}
            style={{ paddingLeft: `${level * 16}px` }}
            onClick={onClick}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onClick?.(); } : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
        >
            <span>{code ? `${code} · ${label}` : label}</span>
            <span className={`${amountClass} min-w-[6.5rem] text-right ${grand ? 'border-t-[3px] border-double border-secondary pt-1' : bold ? 'border-t border-white-dark/40 pt-0.5' : ''}`}>
                {amount == null ? '' : money(amount)}
            </span>
        </div>
    );

    const renderOverview = () => {
        if (!overview) return null;
        const p = overview.project;
        const periodLabel = overview.period.from && overview.period.to
            ? `${shortDate(overview.period.from)} – ${shortDate(overview.period.to)}`
            : 'All transactions';
        return (
            <div>
                <button type="button" className="print:hidden btn btn-outline-secondary mb-3" onClick={() => navigate(base)}>← Back to {cfg.entityPlural}</button>
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{cfg.overviewEyebrow}</div>
                        <h1 className="mt-1 text-2xl font-extrabold text-secondary dark:text-white sm:text-3xl">{p.name}</h1>
                        <p className="mt-1 text-sm text-white-dark">{p.location || '—'}</p>
                    </div>
                    <button type="button" className="print:hidden btn btn-primary" onClick={printNow}>Print summary</button>
                </div>

                <div className="print:hidden mb-5 grid gap-3 rounded-xl border border-white-light bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-dark dark:bg-[#0e1726]">
                    <div><div className="text-[10px] font-semibold uppercase tracking-wide text-white-dark">Status</div><div className="mt-1 text-sm font-medium"><StatusPill value={p.status} /></div></div>
                    <div><div className="text-[10px] font-semibold uppercase tracking-wide text-white-dark">{workspace === 'material_management' ? 'On hand' : workspace === 'real_estate' ? 'Type' : 'Manager'}</div><div className="mt-1 text-sm font-medium">{p.manager || p.type || '—'}</div></div>
                    <div><div className="text-[10px] font-semibold uppercase tracking-wide text-white-dark">Started</div><div className="mt-1 text-sm font-medium">{shortDate(p.startDate)}</div></div>
                    <div><div className="text-[10px] font-semibold uppercase tracking-wide text-white-dark">{cfg.budgetLabel}</div><div className={`mt-1 text-sm ${amountClass}`}>{money(p.budget)}</div></div>
                    <div><div className="text-[10px] font-semibold uppercase tracking-wide text-white-dark">Net</div><div className={`mt-1 text-sm ${amountClass}`}>{money(overview.netIncome)}</div></div>
                </div>

                <div className="print-sheet mx-auto max-w-3xl rounded-2xl border border-white-light bg-white p-7 shadow-sm dark:border-dark dark:bg-[#0e1726]">
                    <div className="flex items-start justify-between">
                        <div className="w-16 text-[10px] leading-relaxed text-white-dark">
                            {new Date(overview.generatedAt).toLocaleString()}
                            <div className="italic">Accrual Basis</div>
                        </div>
                        <div className="flex-1 text-center">
                            <div className="text-sm font-extrabold tracking-wide text-secondary dark:text-white">MAAMULPRO</div>
                            <div className="mt-1 text-lg font-bold text-secondary dark:text-white">{p.name} · Summary</div>
                            <div className="mt-0.5 text-xs text-white-dark">All Transactions</div>
                        </div>
                        <div className="w-16" />
                    </div>
                    <div className="mt-4 flex justify-between border-b-2 border-secondary pb-2 text-xs font-bold dark:border-white">
                        <span />
                        <span className="font-mono">{periodLabel}</span>
                    </div>
                    <div className="mt-2">
                        <div className="py-2 text-[13px] font-bold">Ordinary Income/Expense</div>
                        <div className="py-1 pl-4 text-[13px] font-bold">Income</div>
                        <PlRow code={overview.income.code} label={overview.income.label} amount={overview.income.amount} level={2} />
                        <PlRow label="Total Income" amount={overview.income.amount} level={1} bold />
                        <div className="py-1 pl-4 text-[13px] font-bold">Detail</div>
                        {overview.sections.map((section) => (
                            <div key={section.category}>
                                <div className="pt-3 pl-8 text-[13px] font-bold text-secondary dark:text-white">{section.code} · {section.label}</div>
                                {section.lines.length ? section.lines.map((line) => (
                                    <PlRow
                                        key={`${section.category}-${line.filterKey}-${line.label}`}
                                        code={line.code}
                                        label={line.label}
                                        amount={line.amount}
                                        level={3}
                                        clickable
                                        onClick={() => openCategory(section.category, line.filterKey)}
                                    />
                                )) : (
                                    <div className="py-1 pl-12 text-xs text-white-dark">No entries</div>
                                )}
                                <PlRow
                                    label={`Total ${section.code} · ${section.label}`}
                                    amount={section.total}
                                    level={2}
                                    bold
                                    clickable
                                    onClick={() => openCategory(section.category)}
                                />
                            </div>
                        ))}
                        <PlRow label="Net Income" amount={overview.netIncome} grand />
                    </div>
                    <p className="print:hidden mt-5 text-center text-[11px] italic text-white-dark">
                        Click a category total or line to open its transaction register.
                    </p>
                </div>
            </div>
        );
    };

    const renderCategory = () => {
        if (!ledger || !category) return null;
        const meta = cfg.categories[category];

        const sortedRows = [...ledger.rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const groups = new Map<string, typeof sortedRows>();

        for (const row of sortedRows) {
            const groupKey = cfg.primaryValue(category, row) || 'Uncategorized';
            if (!groups.has(groupKey)) groups.set(groupKey, []);
            groups.get(groupKey)!.push(row);
        }

        const groupedEntries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        return (
            <div>
                <button type="button" className="print:hidden btn btn-outline-secondary mb-3" onClick={() => navigate(`${base}/${entityId}`)}>← Back to {ledger.project.name}</button>
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{ledger.project.name}</div>
                        <h1 className="mt-1 text-2xl font-extrabold text-secondary dark:text-white sm:text-3xl">{meta.label}</h1>
                        <p className="mt-1 text-sm text-white-dark">{meta.desc} · {ledger.rows.length} entries · {money(ledger.total)} total</p>
                    </div>
                    <button type="button" className="print:hidden btn btn-primary" onClick={printNow}>Print</button>
                </div>
                {ledger.filter && (
                    <div className="print:hidden mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
                        Filtered by <strong>{ledger.filterLabel || ledger.filter}</strong>
                        <button type="button" className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs" onClick={clearFilter} aria-label="Clear filter">✕</button>
                    </div>
                )}
                {!ledger.rows.length ? (
                    <div className="panel"><EmptyState title={`No ${meta.label.toLowerCase()} entries`} description="Nothing recorded for this selection in the period." /></div>
                ) : (
                    <div className="print-sheet mx-auto max-w-6xl rounded-2xl border border-white-light bg-white p-7 shadow-sm dark:border-dark dark:bg-[#0e1726]">
                        <div className="mb-6 flex flex-col items-center border-b-2 border-secondary/50 pb-4 dark:border-white/50">
                            <div className="text-sm font-extrabold tracking-wide text-secondary dark:text-white">MAAMULPRO</div>
                            <div className="mt-1 text-lg font-bold text-secondary dark:text-white">Transaction Detail By Account</div>
                            <div className="text-xs text-white-dark">All Transactions</div>
                        </div>
                        {groupedEntries.map(([groupName, rows]) => {
                            let runningBalance = 0;
                            return (
                                <div key={groupName} className="mb-8 last:mb-0">
                                    <h3 className="mb-3 text-[13px] font-bold text-secondary dark:text-white">{meta.label} / {groupName}</h3>
                                    <div className="overflow-hidden">
                                        <div className="table-responsive">
                                            <table className="table-hover text-[12px]">
                                                <thead>
                                                    <tr className="border-b border-secondary/20 dark:border-white/20">
                                                        <th>Type</th>
                                                        <th>Date</th>
                                                        <th>Adj</th>
                                                        <th>Name</th>
                                                        <th>Memo</th>
                                                        <th>Clr</th>
                                                        <th>Split</th>
                                                        <th className="text-right">Debit</th>
                                                        <th className="text-right">Credit</th>
                                                        <th className="text-right">Balance</th>
                                                        <th className="print:hidden w-8" />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row) => {
                                                        const amount = Number(row.amount);
                                                        // Use heuristics to define credit vs debit
                                                        let debit = 0;
                                                        let credit = 0;
                                                        
                                                        if (row.type === 'INCOME' || (workspace === 'real_estate' && category === 'rentals')) {
                                                            credit = amount;
                                                        } else {
                                                            debit = amount;
                                                        }
                                                        
                                                        runningBalance += debit - credit;

                                                        const typeLabel = row.category === 'manpower' ? 'Labor' : row.category === 'materials' ? 'Material' : 'Expense';

                                                        return (
                                                            <tr key={row.id} className="cursor-pointer" onClick={() => navigate(`${base}/${entityId}/${category}/${row.id}`)}>
                                                                <td className="whitespace-nowrap">{typeLabel}</td>
                                                                <td className="whitespace-nowrap">{shortDate(row.date)}</td>
                                                                <td></td>
                                                                <td className="whitespace-nowrap font-medium">{cfg.secondaryValue(category, row) !== '—' ? cfg.secondaryValue(category, row) : row.enteredBy}</td>
                                                                <td className="max-w-[200px] truncate">{row.description || row.notes || '—'}</td>
                                                                <td></td>
                                                                <td className="whitespace-nowrap">Cash / AP</td>
                                                                <td className={`text-right ${amountClass}`}>{debit ? money(debit) : ''}</td>
                                                                <td className={`text-right ${amountClass}`}>{credit ? money(credit) : ''}</td>
                                                                <td className={`text-right ${amountClass}`}>{money(runningBalance)}</td>
                                                                <td className="print:hidden text-white-dark">›</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    <tr className="border-t-[3px] border-double border-secondary/30 font-bold dark:border-white/30">
                                                        <td colSpan={7} className="text-right">Total {groupName}</td>
                                                        <td className={`text-right ${amountClass}`}>{money(rows.reduce((s, r) => s + (r.type === 'INCOME' || (workspace === 'real_estate' && category === 'rentals') ? 0 : Number(r.amount)), 0))}</td>
                                                        <td className={`text-right ${amountClass}`}>{money(rows.reduce((s, r) => s + (r.type === 'INCOME' || (workspace === 'real_estate' && category === 'rentals') ? Number(r.amount) : 0), 0))}</td>
                                                        <td className={`text-right ${amountClass}`}>{money(runningBalance)}</td>
                                                        <td className="print:hidden" />
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderDetail = () => {
        if (!detail) return null;
        const t = detail.transaction;
        return (
            <div>
                <button type="button" className="print:hidden btn btn-outline-secondary mb-3" onClick={() => navigate(`${base}/${entityId}/${detail.category}`)}>← Back to {detail.label}</button>
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{detail.project.name} · {detail.label}</div>
                        <h1 className="mt-1 text-2xl font-extrabold text-secondary dark:text-white sm:text-3xl">Transaction detail</h1>
                        <p className="mt-1 text-sm text-white-dark">
                            {t.worker || t.item || t.description || detail.label} · {shortDate(t.date)}
                        </p>
                    </div>
                    <button type="button" className="print:hidden btn btn-primary" onClick={printNow}>Print voucher</button>
                </div>

                <div className="print-sheet mx-auto max-w-xl overflow-hidden rounded-2xl border border-white-light bg-white shadow-sm dark:border-dark dark:bg-[#0e1726]">
                    <div className="flex items-start justify-between bg-secondary/90 px-7 py-6 text-white">
                        <div>
                            <div className="text-sm font-bold">MAAMULPRO — Transaction Voucher</div>
                            <div className="mt-1 text-xs text-white/70">{detail.project.name} · {detail.label}</div>
                        </div>
                        <div className="text-right text-xs text-primary/90">{shortDate(t.date)}</div>
                    </div>
                    <div className="px-7 py-6">
                        <div className="mb-6 border-b border-dashed border-white-light pb-6 text-center dark:border-dark">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">Amount</div>
                            <div className={`mt-2 text-4xl text-secondary dark:text-white ${amountClass}`}>{money(t.amount)}</div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">{cfg.entitySingular}</div><div className="mt-1 font-medium capitalize">{detail.project.name}</div></div>
                            {(t.worker || t.item) && <div><div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">{t.item ? 'Item' : 'Party'}</div><div className="mt-1 font-medium">{t.item || t.worker}</div></div>}
                            {(t.role || t.status || t.expenseCategory) && <div><div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">Status</div><div className="mt-1 font-medium">{t.status || t.role || t.expenseCategory}</div></div>}
                            {t.description && <div className="sm:col-span-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">Description</div><div className="mt-1 font-medium">{formatDescription(t.description)}</div></div>}
                            {t.quantity != null && <div><div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">Quantity</div><div className="mt-1 font-medium">{t.quantity}{t.unit ? ` ${t.unit}` : ''}</div></div>}
                            {t.unitCost != null && <div><div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">Unit cost</div><div className={`mt-1 ${amountClass}`}>{money(t.unitCost)}</div></div>}
                            <div><div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">Date</div><div className="mt-1 font-medium">{shortDate(t.date)}</div></div>
                            <div><div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">Entered / used by</div><div className="mt-1 font-medium">{t.enteredBy || t.usedBy || t.recordedBy || '—'}</div></div>
                        </div>
                        {t.notes && (
                            <div className="mt-5 rounded-lg border border-white-light bg-white-light/40 p-3 text-sm text-white-dark dark:border-dark dark:bg-dark">{t.notes}</div>
                        )}
                        <div className="mt-8 flex justify-between gap-6 text-[11px] text-white-dark">
                            <div className="flex-1 border-t border-white-dark/40 pt-2">Prepared by — {t.enteredBy || t.recordedBy || '—'}</div>
                            <div className="flex-1 border-t border-white-dark/40 pt-2 text-right">Record — {detail.project.name}</div>
                        </div>
                        <div className="mt-6 flex justify-between border-t border-white-light pt-3 text-[10px] text-white-dark dark:border-dark">
                            <span>Generated by {generatedBy}</span>
                            <span>MaamulPro Reports</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AppShell>
            <style>{`
                @media print {
                    aside, header, .main-header, .sidebar, nav, .print\\:hidden { display: none !important; }
                    .main-content, main, .content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
                    .print-sheet { box-shadow: none !important; border: none !important; max-width: 100% !important; }
                }
            `}</style>
            {stepper}
            {dateFilters}
            {error && <ErrorAlert message={error} />}
            {loading ? <div className="panel"><LoadingState /></div> : (
                <>
                    {view === 'home' && renderHome()}
                    {view === 'overview' && renderOverview()}
                    {view === 'category' && renderCategory()}
                    {view === 'detail' && renderDetail()}
                </>
            )}
        </AppShell>
    );
};

export default ProjectReportsPage;
