import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState, PageHeader, StatusPill, shortDate } from '../components/maamulpro/PageKit';
import { useApiRows } from '../hooks/useApiData';
import { usePermissions } from '../hooks/usePermissions';

type Project = { id: string; name: string; status: string; progress: number; endDate?: string; tasks?: { id: string; title: string; status: string; priority: string; progress: number; dueDate?: string }[] };

const ConstructionProgressPage = () => {
    const state = useApiRows<Project>('/api/construction/projects');
    const { hasPermission } = usePermissions();
    return <AppShell>
        <PageHeader eyebrow="Delivery control" title="Project progress" description="A focused view of completion, task health, blocked work and deadlines." actions={hasPermission('construction_tasks.create') ? <Link className="btn btn-primary" to="/app/construction/tasks/new">Add task</Link> : undefined} />
        {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}
        {state.loading ? <div className="panel"><LoadingState /></div> : !state.rows.length ? <div className="panel"><EmptyState title="No project progress to show" /></div> :
            <div className="space-y-5">{state.rows.map((project) => {
                const tasks = project.tasks || []; const blocked = tasks.filter((task) => task.status === 'BLOCKED').length; const done = tasks.filter((task) => task.status === 'COMPLETED').length;
                return <div className="panel" key={project.id}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><Link to={`/app/construction/projects/${project.id}`} className="text-xl font-bold text-primary">{project.name}</Link><div className="mt-2 flex gap-2"><StatusPill value={project.status} />{blocked > 0 && <span className="badge bg-danger-light text-danger">{blocked} blocked</span>}</div></div><div className="text-right"><strong className="text-3xl text-primary">{project.progress || 0}%</strong><p className="text-xs text-white-dark">Target {shortDate(project.endDate)}</p></div></div>
                    <div className="my-4 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-dark"><div className="h-full bg-gradient-to-r from-primary to-success" style={{ width: `${Math.min(100, project.progress || 0)}%` }} /></div>
                    <div className="mb-3 text-sm text-white-dark">{done} of {tasks.length} tasks completed</div>
                    <div className="grid gap-2 lg:grid-cols-2">{tasks.slice(0, 6).map((task) => <div className="flex items-center justify-between gap-3 rounded-md bg-gray-50 p-3 dark:bg-dark" key={task.id}><div><p className="font-semibold">{task.title}</p><p className="text-xs text-white-dark">{task.priority} · due {shortDate(task.dueDate)}</p></div><StatusPill value={task.status} /></div>)}</div>
                </div>;
            })}</div>}
    </AppShell>;
};

export default ConstructionProgressPage;
