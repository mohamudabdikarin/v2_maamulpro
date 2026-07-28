import { FormEvent, useEffect, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { api } from '../lib/api';

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

const initialForm = { materialId: '', type: 'RESTOCK', quantity: '', projectId: '', warehouse: '', notes: '' };

const ConstructionInventoryPage = () => {
    const [inventory, setInventory] = useState<InventoryResponse | null>(null);
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const load = () => api<InventoryResponse>('/api/construction/inventory').then(setInventory).catch((reason) => setError(reason.message));
    useEffect(() => { load(); }, []);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api('/api/construction/inventory/movements', {
                method: 'POST',
                body: JSON.stringify({
                    materialId: form.materialId,
                    type: form.type,
                    quantity: Number(form.quantity),
                    projectId: form.projectId || undefined,
                    warehouse: form.warehouse || undefined,
                    notes: form.notes || undefined,
                }),
            });
            setForm(initialForm);
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to record stock movement');
        } finally {
            setSaving(false);
        }
    };

    return <AppShell>
        <div className="mb-6">
            <h1 className="text-2xl font-extrabold">Construction Inventory</h1>
            <p className="mt-1 text-white-dark">Project material availability, valuation, and auditable stock movements.</p>
        </div>
        {error && <div className="mb-5 rounded-md bg-danger-light p-4 text-danger">{error}</div>}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="panel"><p className="text-white-dark">Materials</p><p className="mt-2 text-3xl font-bold">{inventory?.summary.materialCount ?? '—'}</p></div>
            <div className="panel"><p className="text-white-dark">Low stock</p><p className="mt-2 text-3xl font-bold text-warning">{inventory?.summary.lowStockCount ?? '—'}</p></div>
            <div className="panel"><p className="text-white-dark">Stock value</p><p className="mt-2 text-3xl font-bold text-success">${Number(inventory?.summary.stockValue || 0).toLocaleString()}</p></div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form className="panel space-y-4" onSubmit={submit}>
                <h2 className="text-lg font-bold">Record movement</h2>
                <div><label>Material</label><select className="form-select mt-1" required value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })}><option value="">Select material…</option>{inventory?.materials.map((material) => <option value={material.id} key={material.id}>{material.name} ({material.quantity} {material.unit})</option>)}</select></div>
                <div><label>Movement type</label><select className="form-select mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['RESTOCK', 'USAGE', 'ADJUSTMENT', 'TRANSFER'].map((type) => <option key={type}>{type}</option>)}</select></div>
                <div><label>Quantity</label><input className="form-input mt-1" type="number" min="0.01" step="0.01" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                {form.type === 'USAGE' && <div><label>Project ID</label><input className="form-input mt-1" required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} /></div>}
                <div><label>Warehouse</label><input className="form-input mt-1" value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} /></div>
                <div><label>Notes</label><textarea className="form-textarea mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <button className="btn btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Record movement'}</button>
            </form>
            <div className="space-y-6 overflow-hidden">
                <div className="panel overflow-x-auto p-0">
                    <div className="border-b border-white-light p-5 dark:border-[#191e3a]"><h2 className="text-lg font-bold">Stock on hand</h2></div>
                    <table className="table-hover w-full"><thead><tr><th>Material</th><th>Quantity</th><th>Unit cost</th><th>Warehouse</th><th>Status</th></tr></thead>
                        <tbody>{inventory?.materials.map((material) => {
                            const low = Number(material.quantity) <= Number(material.lowStockThreshold);
                            return <tr key={material.id}><td className="font-semibold">{material.name}</td><td>{material.quantity} {material.unit}</td><td>${Number(material.unitCost).toLocaleString()}</td><td>{material.warehouse || '—'}</td><td><span className={`badge ${low ? 'bg-warning' : 'bg-success'}`}>{low ? 'LOW STOCK' : 'AVAILABLE'}</span></td></tr>;
                        })}</tbody>
                    </table>
                </div>
                <div className="panel overflow-x-auto p-0">
                    <div className="border-b border-white-light p-5 dark:border-[#191e3a]"><h2 className="text-lg font-bold">Movement history</h2></div>
                    <table className="table-hover w-full"><thead><tr><th>Date</th><th>Material</th><th>Type</th><th>Quantity</th><th>Project</th><th>Notes</th></tr></thead>
                        <tbody>{inventory?.movements.map((movement) => <tr key={movement.id}><td>{new Date(movement.date).toLocaleDateString()}</td><td>{movement.material?.name}</td><td><span className="badge bg-primary">{movement.type}</span></td><td>{movement.quantity}</td><td>{movement.project?.name || '—'}</td><td>{movement.notes || '—'}</td></tr>)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    </AppShell>;
};

export default ConstructionInventoryPage;
