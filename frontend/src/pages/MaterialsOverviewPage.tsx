import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { EmptyState, ErrorAlert, LoadingState, PageHeader, StatGrid, StatusPill, money, shortDate } from '../components/maamulpro/PageKit';
import { api } from '../lib/api';
import { unwrapRows } from '../hooks/useApiData';
import { usePermissions } from '../hooks/usePermissions';

const MaterialsOverviewPage = () => {
    const { hasPermission } = usePermissions();
    const [data, setData] = useState<{ products: any[]; purchases: any[]; sales: any[]; transport: any[] } | null>(null); const [error, setError] = useState('');
    const read = (permission: string, url: string) => hasPermission(permission) ? api<unknown>(url) : Promise.resolve([]);
    const load = () => Promise.all([read('materials_products.read', '/api/materials/products'), read('purchases.read', '/api/materials/purchases'), read('material_sales.read', '/api/materials/sales'), read('transportation.read', '/api/materials/transportation')]).then(([a, b, c, d]) => setData({ products: unwrapRows(a), purchases: unwrapRows(b), sales: unwrapRows(c), transport: unwrapRows(d) })).catch((reason) => setError(reason.message));
    useEffect(() => { load(); }, []);
    return <AppShell><PageHeader eyebrow="Materials workspace" title="Materials overview" description="Inventory valuation, low-stock exposure, purchasing, sales and deliveries." actions={<>{hasPermission('reports.material.read') && <Link className="btn btn-outline-primary" to="/app/materials/reports">Reports</Link>}{hasPermission('materials_products.create') && <Link className="btn btn-primary" to="/app/materials/inventory/manage/new">Add material</Link>}</>} />
        {error && <ErrorAlert message={error} onRetry={load} />}{!data ? <div className="panel"><LoadingState /></div> : <>
            <StatGrid items={[
                { label: 'Products', value: data.products.length },
                { label: 'Inventory value', value: money(data.products.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.unitCost || 0), 0)), tone: 'info' },
                { label: 'Low stock items', value: data.products.filter((row) => Number(row.quantity) <= Number(row.lowStockThreshold)).length, tone: 'danger' },
                { label: 'Sales value', value: money(data.sales.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0)), tone: 'success' },
            ]} />
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Inventory', '/app/materials/inventory', 'Products and stock', 'materials_products.read'], ['Suppliers', '/app/materials/suppliers', 'Vendor balances', 'suppliers.read'], ['Purchases', '/app/materials/purchases', 'Ordering and receiving', 'purchases.read'], ['Sales', '/app/materials/sales', 'Invoices and collections', 'material_sales.read']].filter(([, , , permission]) => hasPermission(permission)).map(([title, to, description]) => <Link className="panel transition hover:-translate-y-1 hover:border-primary" to={to} key={to}><h2 className="font-bold text-primary">{title}</h2><p className="mt-1 text-sm text-white-dark">{description}</p></Link>)}</div>
            <div className="grid gap-6 xl:grid-cols-2">{hasPermission('purchases.read') && <div className="panel overflow-hidden p-0"><div className="flex justify-between p-5"><h2 className="text-lg font-bold">Recent purchase orders</h2><Link className="text-primary" to="/app/materials/purchases">Manage</Link></div>{!data.purchases.length ? <EmptyState title="No purchase orders" /> : <div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Order</th><th>Supplier</th><th>Total</th><th>Status</th></tr></thead><tbody>{data.purchases.slice(0, 8).map((row) => <tr key={row.id}><td>{row.orderNo}</td><td>{row.supplier?.name || 'Direct'}</td><td>{money(row.totalCost)}</td><td><StatusPill value={row.status} /></td></tr>)}</tbody></table></div>}</div>}
                {hasPermission('transportation.read') && <div className="panel overflow-hidden p-0"><div className="flex justify-between p-5"><h2 className="text-lg font-bold">Delivery tracking</h2><Link className="text-primary" to="/app/materials/transportation">Manage</Link></div>{!data.transport.length ? <EmptyState title="No deliveries" /> : <div className="overflow-x-auto"><table className="table-hover"><thead><tr><th>Delivery</th><th>Material</th><th>Date</th><th>Status</th></tr></thead><tbody>{data.transport.slice(0, 8).map((row) => <tr key={row.id}><td>{row.deliveryNo}</td><td>{row.material?.name}</td><td>{shortDate(row.deliveryDate)}</td><td><StatusPill value={row.status} /></td></tr>)}</tbody></table></div>}</div>}</div>
        </>}
    </AppShell>;
};

export default MaterialsOverviewPage;
