import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { AuthenticatedImage } from '../components/maamulpro/AuthenticatedImage';
import { EmptyState, ErrorAlert, LoadingState, Modal, PageHeader, StatGrid, StatusPill, money } from '../components/maamulpro/PageKit';
import { useApiRows } from '../hooks/useApiData';
import { api } from '../lib/api';

const MaterialsInventoryPage = () => {
    const state = useApiRows<any>('/api/materials/products');
    const [search, setSearch] = useState('');
    const [warehouse, setWarehouse] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteName, setDeleteName] = useState('');
    const [deleting, setDeleting] = useState(false);
    const confirmDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await api(`/api/materials/products/${deleteId}`, { method: 'DELETE' });
            setDeleteId(null);
            await state.reload();
        } catch (reason) {
            state.setError(reason instanceof Error ? reason.message : 'Unable to delete product');
        } finally {
            setDeleting(false);
        }
    };
    const rows = useMemo(() => state.rows.filter((row) => (!warehouse || row.warehouse === warehouse) && JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [state.rows, search, warehouse]);
    const warehouses = Array.from(new Set(state.rows.map((row) => row.warehouse).filter(Boolean)));
    return <AppShell><PageHeader eyebrow="Materials inventory" title="Stock catalog" description="Product images, warehouses, buying cost, selling price and replenishment thresholds." actions={<><Link className="btn btn-outline-primary" to="/app/materials/inventory/manage">All products</Link><Link className="btn btn-primary" to="/app/materials/inventory/manage/new">Add product</Link></>} />
        <StatGrid items={[{ label: 'SKUs', value: state.rows.length }, { label: 'Units on hand', value: state.rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0), tone: 'info' }, { label: 'Stock value', value: money(state.rows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.unitCost || 0), 0)), tone: 'success' }, { label: 'Low stock', value: state.rows.filter((row) => Number(row.quantity) <= Number(row.lowStockThreshold)).length, tone: 'danger' }]} />
        <div className="panel mb-5 flex flex-col gap-3 sm:flex-row"><input className="form-input flex-1" placeholder="Search materials…" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="form-select sm:w-56" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}><option value="">All warehouses</option>{warehouses.map((value) => <option key={value}>{value}</option>)}</select></div>
        {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}{state.loading ? <div className="panel"><LoadingState /></div> : !rows.length ? <div className="panel"><EmptyState title="No matching materials" /></div> : <div className="panel overflow-hidden p-0"><div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Material</th><th>Warehouse</th><th>On hand</th><th>Unit cost</th><th>Sale price</th><th>Stock value</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="flex items-center gap-3">{row.photoUrl ? <AuthenticatedImage className="h-10 w-10 rounded object-cover" src={row.photoUrl} alt="" /> : <div className="grid h-10 w-10 place-items-center rounded bg-primary-light text-primary">□</div>}<div><strong>{row.name}</strong><p className="text-xs text-white-dark">{row.category || row.materialType || row.unit}</p></div></div></td><td>{row.warehouse || 'General'}</td><td><span className={Number(row.quantity) <= Number(row.lowStockThreshold) ? 'font-bold text-danger' : 'font-bold'}>{row.quantity} {row.unit}</span></td><td>{money(row.unitCost)}</td><td>{money(row.salePrice)}</td><td>{money(Number(row.quantity) * Number(row.unitCost))}</td><td><StatusPill value={row.status} /></td><td><div className="flex gap-2"><Link className="btn btn-sm btn-outline-primary" to={`/app/materials/inventory/manage/${row.id}/edit`}>Edit</Link><button className="btn btn-sm btn-outline-danger" onClick={() => { setDeleteId(row.id); setDeleteName(row.name); }}>Delete</button></div></td></tr>)}</tbody></table></div></div>}
        <Modal open={Boolean(deleteId)} onClose={() => !deleting && setDeleteId(null)} title="Delete product">
            <div className="space-y-4">
                <p className="text-white-dark">This will permanently remove <strong>{deleteName}</strong> and cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button className="btn btn-outline-dark" disabled={deleting} onClick={() => setDeleteId(null)}>Cancel</button>
                    <button className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Please wait…' : 'Delete product'}</button>
                </div>
            </div>
        </Modal>
    </AppShell>;
};

export default MaterialsInventoryPage;
