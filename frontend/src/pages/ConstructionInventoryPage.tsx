import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import {
    EmptyState,
    ErrorAlert,
    Field,
    FormActions,
    LoadingState,
    Modal,
    PageHeader,
    StatusPill,
} from '../components/maamulpro/PageKit';
import { PermissionButton } from '../components/PermissionButton';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

type Material = {
    id: string;
    name: string;
    quantity: number | string;
    unit: string;
    unitCost: number | string;
    warehouse?: string;
    lowStockThreshold: number | string;
};

type Movement = {
    id: string;
    type: string;
    quantity: number | string;
    date: string;
    notes?: string;
    warehouse?: string;
    material?: Material;
    project?: { name: string };
};

type InventoryResponse = {
    materials: Material[];
    movements: Movement[];
    summary: { materialCount: number; lowStockCount: number; stockValue: number };
};

const MOVEMENT_TYPES = ['RESTOCK', 'USAGE', 'ADJUSTMENT'] as const;
const initialForm = { materialId: '', type: 'RESTOCK', quantity: '', projectId: '', warehouse: '', notes: '' };

const currency = (value: number | string) => `$${Number(value || 0).toLocaleString()}`;

const ConstructionInventoryPage = () => {
    const [inventory, setInventory] = useState<InventoryResponse | null>(null);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'stock' | 'movements'>('stock');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        setError('');
        return Promise.all([
            api<InventoryResponse>('/api/construction/inventory', { silent: true }),
            api<unknown>('/api/construction/projects', { silent: true }).then((result) => {
                const rows = Array.isArray(result) ? result : (result as any)?.data || [];
                return rows.map((row: any) => ({ id: row.id, name: row.name }));
            }).catch(() => []),
        ])
            .then(([inv, projectRows]) => {
                setInventory(inv);
                setProjects(projectRows);
            })
            .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load inventory'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { void load(); }, []);

    const openModal = () => { setForm(initialForm); setModalOpen(true); };
    const closeModal = () => { if (!saving) setModalOpen(false); };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (form.type === 'USAGE' && !form.projectId) {
            toast.error('Select a project for material usage');
            return;
        }
        setSaving(true);
        try {
            await api('/api/construction/inventory/movements', {
                method: 'POST',
                silent: true,
                body: JSON.stringify({
                    materialId: form.materialId,
                    type: form.type,
                    quantity: Number(form.quantity),
                    projectId: form.projectId || undefined,
                    warehouse: form.warehouse || undefined,
                    notes: form.notes || undefined,
                }),
            });
            toast.success('Stock movement recorded.');
            setModalOpen(false);
            setForm(initialForm);
            await load();
        } catch (reason) {
            toast.error(reason instanceof Error ? reason.message : 'Unable to record stock movement');
        } finally {
            setSaving(false);
        }
    };

    const summaryCards = useMemo(() => [
        { label: 'Materials tracked', value: inventory?.summary.materialCount ?? '—', tone: 'text-primary' },
        { label: 'Low stock', value: inventory?.summary.lowStockCount ?? '—', tone: 'text-warning' },
        { label: 'Stock value', value: inventory ? currency(inventory.summary.stockValue) : '—', tone: 'text-success' },
    ], [inventory]);

    return <AppShell>
        <PageHeader
            title="Construction inventory"
            actions={<>
                <Link to="/app/materials/inventory/manage" className="btn btn-outline-primary">Manage material catalog</Link>
                <PermissionButton perm="construction_inventory.create" className="btn btn-primary" onClick={openModal}>Record movement</PermissionButton>
            </>}
        />

        {error && <ErrorAlert message={error} onRetry={load} />}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {summaryCards.map((card) => (
                <div className="panel" key={card.label}>
                    <p className="text-white-dark">{card.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}</p>
                </div>
            ))}
        </div>

        <div className="panel p-0">
            <div className="flex items-center gap-1 border-b border-white-light px-3 pt-3 dark:border-[#191e3a]">
                <button
                    type="button"
                    className={`rounded-t-md px-4 py-2 text-sm font-semibold transition ${tab === 'stock' ? 'bg-primary text-white' : 'text-white-dark hover:bg-primary-light/40'}`}
                    onClick={() => setTab('stock')}
                >Stock on hand</button>
                <button
                    type="button"
                    className={`rounded-t-md px-4 py-2 text-sm font-semibold transition ${tab === 'movements' ? 'bg-primary text-white' : 'text-white-dark hover:bg-primary-light/40'}`}
                    onClick={() => setTab('movements')}
                >Movement history</button>
            </div>

            {loading && !inventory ? <LoadingState /> : tab === 'stock' ? (
                !inventory?.materials.length ? (
                    <EmptyState
                        title="No materials registered yet"
                        description="Add your material items (such as Cement, Steel, Bricks) to the catalog to start tracking construction inventory and site usage."
                        action={<Link to="/app/materials/inventory/manage/new" className="btn btn-primary">Add material product</Link>}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-hover w-full">
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th>Quantity</th>
                                    <th>Unit cost</th>
                                    <th>Warehouse</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.materials.map((material) => {
                                    const low = Number(material.quantity) <= Number(material.lowStockThreshold);
                                    return (
                                        <tr key={material.id}>
                                            <td className="font-semibold">{material.name}</td>
                                            <td>{material.quantity} {material.unit}</td>
                                            <td>{currency(material.unitCost)}</td>
                                            <td>{material.warehouse || '—'}</td>
                                            <td><StatusPill value={low ? 'LOW STOCK' : 'AVAILABLE'} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                !inventory?.movements.length ? (
                    <EmptyState title="No movements yet" description="Recorded stock movements will show up here." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-hover w-full">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Material</th>
                                    <th>Type</th>
                                    <th>Quantity</th>
                                    <th>Project</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.movements.map((movement) => (
                                    <tr key={movement.id}>
                                        <td>{new Date(movement.date).toLocaleDateString()}</td>
                                        <td>{movement.material?.name || '—'}</td>
                                        <td><StatusPill value={movement.type} /></td>
                                        <td>{movement.quantity}</td>
                                        <td>{movement.project?.name || '—'}</td>
                                        <td>{movement.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>

        <Modal title="Record stock movement" open={modalOpen} onClose={closeModal}>
            <form className="grid gap-4" onSubmit={submit}>
                {!inventory?.materials.length && (
                    <div className="rounded-md bg-warning-light p-3 text-xs font-semibold text-warning">
                        ⚠️ No materials exist in your catalog yet. <Link to="/app/materials/inventory/manage/new" className="font-bold underline">Click here to add your first material product</Link>.
                    </div>
                )}
                <Field label="Material" required>
                    <select
                        className="form-select"
                        required
                        value={form.materialId}
                        onChange={(event) => setForm({ ...form, materialId: event.target.value })}
                    >
                        <option value="">Select material…</option>
                        {inventory?.materials.map((material) => (
                            <option value={material.id} key={material.id}>
                                {material.name} ({material.quantity} {material.unit})
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Movement type" required>
                    <select
                        className="form-select"
                        value={form.type}
                        onChange={(event) => setForm({ ...form, type: event.target.value })}
                    >
                        {MOVEMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                </Field>

                <Field label="Quantity" required>
                    <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        required
                        value={form.quantity}
                        onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                    />
                </Field>

                {form.type === 'USAGE' && (
                    <Field label="Project" required>
                        <select
                            className="form-select"
                            required
                            value={form.projectId}
                            onChange={(event) => setForm({ ...form, projectId: event.target.value })}
                        >
                            <option value="">Select project…</option>
                            {projects.map((project) => (
                                <option value={project.id} key={project.id}>{project.name}</option>
                            ))}
                        </select>
                    </Field>
                )}

                {form.type === 'ADJUSTMENT' && (
                    <p className="text-xs text-white-dark">Use a positive quantity to add stock, or a negative quantity to write off stock.</p>
                )}

                <Field label="Warehouse">
                    <input
                        className="form-input"
                        value={form.warehouse}
                        onChange={(event) => setForm({ ...form, warehouse: event.target.value })}
                    />
                </Field>

                <Field label="Notes">
                    <textarea
                        className="form-textarea"
                        rows={3}
                        value={form.notes}
                        onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    />
                </Field>

                <FormActions onCancel={closeModal} loading={saving} saveLabel="Record movement" savingLabel="Recording…" />
            </form>
        </Modal>
    </AppShell>;
};

export default ConstructionInventoryPage;
