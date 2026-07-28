import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState, PageHeader, StatGrid, StatusPill, money, shortDate } from '../components/maamulpro/PageKit';
import { useApiRows } from '../hooks/useApiData';

type Project = { id: string; name: string; location?: string; status: string; budget: number; progress: number; imageUrl?: string; endDate?: string; tasks?: { status: string }[]; dailyExpenses?: { amount: number }[]; assignedStaff?: unknown[] };

const ConstructionOverviewPage = () => {
    const state = useApiRows<Project>('/api/construction/projects');
    const projects = state.rows;
    const active = projects.filter((project) => ['PLANNING', 'ONGOING', 'ON_HOLD'].includes(project.status));
    const budget = projects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
    const spent = projects.reduce((sum, project) => sum + (project.dailyExpenses || []).reduce((total, row) => total + Number(row.amount || 0), 0), 0);
    const tasks = projects.flatMap((project) => project.tasks || []);
    return <AppShell>
        <PageHeader eyebrow="Construction workspace" title="Construction overview" description="Live project delivery, site costs, staffing, task progress and deadlines." actions={<>
            <Link className="btn btn-outline-primary" to="/app/construction/reports">Reports</Link>
            <Link className="btn btn-primary" to="/app/construction/projects/new">New project</Link>
        </>} />
        <StatGrid items={[
            { label: 'Active projects', value: active.length, hint: `${projects.length} total` },
            { label: 'Portfolio budget', value: money(budget), tone: 'info' },
            { label: 'Recorded site costs', value: money(spent), tone: 'danger' },
            { label: 'Tasks complete', value: `${tasks.filter((task) => task.status === 'COMPLETED').length}/${tasks.length}`, tone: 'success' },
        ]} />
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[['Projects', '/app/construction/projects', 'Budgets and delivery'], ['Tasks', '/app/construction/tasks', 'Assignments and deadlines'], ['Manpower', '/app/construction/manpower', 'Workers and labor costs'], ['Inventory', '/app/construction/inventory', 'Site stock and movements']].map(([title, to, description]) =>
                <Link className="panel transition hover:-translate-y-1 hover:border-primary" to={to} key={to}><h2 className="font-bold text-primary">{title}</h2><p className="mt-1 text-sm text-white-dark">{description}</p></Link>)}
        </div>
        {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}
        {state.loading ? <div className="panel"><LoadingState /></div> : !projects.length ? <div className="panel"><EmptyState title="No construction projects" description="Create the first project to begin tracking delivery." action={<Link className="btn btn-primary" to="/app/construction/projects/new">Create project</Link>} /></div> :
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{projects.slice(0, 6).map((project) => {
                const completed = (project.tasks || []).filter((task) => task.status === 'COMPLETED').length;
                return <Link className="panel overflow-hidden p-0 transition hover:-translate-y-1" to={`/app/construction/projects/${project.id}`} key={project.id}>
                    {project.imageUrl ? <img src={project.imageUrl} className="h-36 w-full object-cover" alt="" /> : <div className="h-20 bg-gradient-to-r from-primary to-info" />}
                    <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{project.name}</h2><p className="text-sm text-white-dark">{project.location || 'Location not set'}</p></div><StatusPill value={project.status} /></div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, project.progress || 0)}%` }} /></div>
                        <div className="mt-2 flex justify-between text-xs text-white-dark"><span>{project.progress || 0}% complete</span><span>{completed}/{project.tasks?.length || 0} tasks</span></div>
                        <div className="mt-4 flex justify-between border-t border-white-light pt-3 text-sm dark:border-dark"><span>{money(project.budget)}</span><span>Due {shortDate(project.endDate)}</span></div>
                    </div>
                </Link>;
            })}</div>}
    </AppShell>;
};

export default ConstructionOverviewPage;
