import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { AuthenticatedImage } from '../components/maamulpro/AuthenticatedImage';
import { EmptyState, ErrorAlert, LoadingState, Modal, PageHeader, StatGrid, StatusPill, money, shortDate } from '../components/maamulpro/PageKit';
import { useApiRows } from '../hooks/useApiData';
import { api } from '../lib/api';

type Project = { id: string; name: string; location?: string; description?: string; status: string; budget: number; progress: number; imageUrl?: string; startDate?: string; endDate?: string; tasks?: unknown[]; assignedStaff?: unknown[]; _count?: { tasks: number; workforceContracts: number } };

const ConstructionProjectsPage = () => {
    const state = useApiRows<Project>('/api/construction/projects');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteName, setDeleteName] = useState('');
    const [deleting, setDeleting] = useState(false);
    const confirmDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await api(`/api/construction/projects/${deleteId}`, { method: 'DELETE' });
            setDeleteId(null);
            await state.reload();
        } catch (reason) {
            state.setError(reason instanceof Error ? reason.message : 'Unable to delete project');
        } finally {
            setDeleting(false);
        }
    };
    const rows = useMemo(() => state.rows.filter((row) => (!status || row.status === status) && JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [state.rows, search, status]);
    return <AppShell>
        <PageHeader eyebrow="Construction" title="Projects" description="Every site, budget, schedule, delivery stage and assigned workforce." actions={<>
            <Link className="btn btn-outline-primary" to="/app/construction/overview">Overview</Link>
            <Link className="btn btn-primary" to="/app/construction/projects/new">New project</Link>
        </>} />
        <StatGrid items={[
            { label: 'Projects', value: state.rows.length },
            { label: 'In progress', value: state.rows.filter((row) => row.status === 'ONGOING').length, tone: 'info' },
            { label: 'Completed', value: state.rows.filter((row) => row.status === 'COMPLETED').length, tone: 'success' },
            { label: 'Total budget', value: money(state.rows.reduce((sum, row) => sum + Number(row.budget), 0)), tone: 'warning' },
        ]} />
        <div className="panel mb-5 flex flex-col gap-3 sm:flex-row"><input className="form-input flex-1" placeholder="Search projects, locations or descriptions…" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="form-select sm:w-56" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['PLANNING', 'ONGOING', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((value) => <option value={value} key={value}>{value.replace(/_/g, ' ')}</option>)}</select></div>
        {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}
        {state.loading ? <div className="panel"><LoadingState /></div> : !rows.length ? <div className="panel"><EmptyState title="No matching projects" /></div> :
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rows.map((project) => <article className="panel overflow-hidden p-0" key={project.id}>
                {project.imageUrl ? <AuthenticatedImage className="h-44 w-full object-cover" src={project.imageUrl} alt="" /> : <div className="h-24 bg-gradient-to-br from-primary/80 to-info" />}
                <div className="p-5"><div className="flex items-start justify-between gap-2"><div><h2 className="text-xl font-bold">{project.name}</h2><p className="text-sm text-white-dark">{project.location || 'No location'}</p></div><StatusPill value={project.status} /></div>
                    <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-white-dark">{project.description || 'No description provided.'}</p>
                    <div className="mt-4 flex justify-between text-xs"><span>Progress</span><strong>{project.progress || 0}%</strong></div><div className="mt-1 h-2 rounded bg-gray-200 dark:bg-dark"><div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, project.progress || 0)}%` }} /></div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><span className="text-white-dark">Budget</span><strong className="block">{money(project.budget)}</strong></div><div><span className="text-white-dark">End date</span><strong className="block">{shortDate(project.endDate)}</strong></div><div><span className="text-white-dark">Tasks</span><strong className="block">{project._count?.tasks ?? project.tasks?.length ?? 0}</strong></div><div><span className="text-white-dark">Team</span><strong className="block">{project.assignedStaff?.length || 0}</strong></div></div>
                    <div className="mt-5 flex gap-2"><Link className="btn btn-sm btn-primary flex-1" to={`/app/construction/projects/${project.id}`}>Open</Link><Link className="btn btn-sm btn-outline-primary" to={`/app/construction/projects/${project.id}/edit`}>Edit</Link><button className="btn btn-sm btn-outline-danger" onClick={() => { setDeleteId(project.id); setDeleteName(project.name); }}>Delete</button></div>
                </div>
            </article>)}</div>}
        <Modal open={Boolean(deleteId)} onClose={() => !deleting && setDeleteId(null)} title="Delete project">
            <div className="space-y-4">
                <p className="text-white-dark">This will permanently remove <strong>{deleteName}</strong> and all its tasks and expenses. This cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={deleting} onClick={() => setDeleteId(null)}>Cancel</button>
                    <button className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Please wait…' : 'Delete project'}</button>
                </div>
            </div>
        </Modal>
    </AppShell>;
};

export default ConstructionProjectsPage;
