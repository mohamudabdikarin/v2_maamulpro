const baseUrl = process.env.E2E_API_URL || 'http://127.0.0.1:4000';
const email = process.env.E2E_TENANT_EMAIL;
const password = process.env.E2E_TENANT_PASSWORD;

if (!email || !password) {
  throw new Error('E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD are required');
}

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(`${init.method || 'GET'} ${path} failed (${response.status})${message ? `: ${message}` : ''}`);
  }
  return body?.data ?? body;
};

const login = await request('/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const token = login.accessToken;
if (!token) throw new Error('Login response did not include an access token');

const headers = {
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-company-id': login.user?.companyId,
};
const get = (path) => request(path, { headers });
const post = (path, data) => request(path, { method: 'POST', headers, body: JSON.stringify(data) });

const projects = await get('/api/reports/projects');
const project = projects.find((row) => row.name === 'Siiv Apartments') || projects[0];
if (!project) throw new Error('Construction project report was not found');
const constructionBefore = await get(`/api/reports/projects/${project.id}/overview`);

const productSpecs = [
  { name: 'MM Test Cement 42.5R', category: 'Retail Building Materials', materialType: 'Resale Stock', unit: 'BAG', unitCost: 4.5, salePrice: 5.5, warehouse: 'MM Main Warehouse', lowStockThreshold: 20 },
  { name: 'MM Test Electrical Cable Roll', category: 'Electrical', materialType: 'Resale Stock', unit: 'PIECE', unitCost: 45, salePrice: 60, warehouse: 'MM Main Warehouse', lowStockThreshold: 5 },
  { name: 'MM Test PVC Pipe 4in', category: 'Plumbing', materialType: 'Resale Stock', unit: 'PIECE', unitCost: 8, salePrice: 12, warehouse: 'MM Main Warehouse', lowStockThreshold: 15 },
  { name: 'MM Test Interior Paint 20L', category: 'Finishing', materialType: 'Resale Stock', unit: 'BUCKET', unitCost: 20, salePrice: 28, warehouse: 'MM Main Warehouse', lowStockThreshold: 8 },
];

let products = await get('/api/materials/products');
for (const spec of productSpecs) {
  if (!products.some((row) => row.name === spec.name)) {
    await post('/api/materials/products', { ...spec, quantity: 0, status: 'ACTIVE' });
  }
}
products = await get('/api/materials/products');
const seededProducts = Object.fromEntries(productSpecs.map((spec) => {
  const product = products.find((row) => row.name === spec.name);
  if (!product) throw new Error(`Material product was not created: ${spec.name}`);
  return [spec.name, product];
}));

let suppliers = await get('/api/materials/suppliers');
let supplier = suppliers.find((row) => row.name === 'MM Test Wholesale Supplier');
if (!supplier) {
  supplier = await post('/api/materials/suppliers', {
    name: 'MM Test Wholesale Supplier',
    phone: '+252 61 555 0101',
    address: 'Bakaaraha, Mogadishu',
    notes: 'Independent Material Management test supplier',
  });
}

let customers = await get('/api/materials/customers');
let customer = customers.find((row) => row.name === 'MM Test Hardware Customer');
if (!customer) {
  customer = await post('/api/materials/customers', {
    name: 'MM Test Hardware Customer',
    phone: '+252 61 555 0202',
    address: 'Waberi, Mogadishu',
  });
}

let purchases = await get('/api/materials/purchases');
let purchase = purchases.find((row) => row.orderNo === 'MM-PO-TEST-001');
if (!purchase) {
  purchase = await post('/api/materials/purchases', {
    orderNo: 'MM-PO-TEST-001',
    supplierId: supplier.id,
    orderedAt: '2026-06-02T00:00:00.000Z',
    notes: 'Independent Material Management stock receipt',
    items: [
      { materialId: seededProducts['MM Test Cement 42.5R'].id, quantity: 100, unitCost: 4.5 },
      { materialId: seededProducts['MM Test Electrical Cable Roll'].id, quantity: 20, unitCost: 45 },
      { materialId: seededProducts['MM Test PVC Pipe 4in'].id, quantity: 60, unitCost: 8 },
      { materialId: seededProducts['MM Test Interior Paint 20L'].id, quantity: 30, unitCost: 20 },
    ],
  });
}
if (purchase.status !== 'RECEIVED') {
  purchase = await post(`/api/materials/purchases/${purchase.id}/status`, { status: 'RECEIVED' });
}

let sales = await get('/api/materials/sales');
let sale = sales.find((row) => row.invoiceNo === 'MM-INV-TEST-001');
if (!sale) {
  sale = await post('/api/materials/sales', {
    invoiceNo: 'MM-INV-TEST-001',
    customerId: customer.id,
    paidAmount: 200,
    discountPercent: 5,
    date: '2026-06-24T00:00:00.000Z',
    notes: 'Independent Material Management test sale',
    items: [
      { materialId: seededProducts['MM Test Cement 42.5R'].id, quantity: 10, unitPrice: 5.5 },
      { materialId: seededProducts['MM Test Electrical Cable Roll'].id, quantity: 2, unitPrice: 60 },
      { materialId: seededProducts['MM Test PVC Pipe 4in'].id, quantity: 6, unitPrice: 12 },
      { materialId: seededProducts['MM Test Interior Paint 20L'].id, quantity: 3, unitPrice: 28 },
    ],
  });
}

let deliveries = await get('/api/materials/transportation');
let delivery = deliveries.find((row) => row.deliveryNo === 'MM-DEL-TEST-001');
if (!delivery) {
  delivery = await post('/api/materials/transportation', {
    deliveryNo: 'MM-DEL-TEST-001',
    responsiblePerson: 'MM Test Driver',
    cost: 75,
    deliveryDate: '2026-06-25T00:00:00.000Z',
    notes: 'Independent Material Management delivery test',
    materialId: seededProducts['MM Test Cement 42.5R'].id,
    quantity: 50,
  });
}
if (delivery.status !== 'DELIVERED') {
  delivery = await post(`/api/materials/transportation/${delivery.id}/status`, { status: 'DELIVERED' });
}

const [finalProducts, finalPurchases, finalSales, finalDeliveries, materialReports, constructionAfter] = await Promise.all([
  get('/api/materials/products'),
  get('/api/materials/purchases'),
  get('/api/materials/sales'),
  get('/api/materials/transportation'),
  get('/api/reports/materials'),
  get(`/api/reports/projects/${project.id}/overview`),
]);

const constructionBeforeCost = Number(constructionBefore.totalExpense);
const constructionAfterCost = Number(constructionAfter.totalExpense);
if (constructionBeforeCost !== constructionAfterCost) {
  throw new Error(`Construction total changed after Material Management activity: ${constructionBeforeCost} -> ${constructionAfterCost}`);
}

const stock = finalProducts
  .filter((row) => productSpecs.some((spec) => spec.name === row.name))
  .map((row) => ({ name: row.name, quantity: Number(row.quantity), stockValue: Number(row.quantity) * Number(row.unitCost) }));

console.log(JSON.stringify({
  tenant: login.user?.companyName,
  construction: { project: project.name, totalExpense: constructionAfterCost, unchanged: true },
  materialManagement: {
    products: finalProducts.length,
    purchaseOrders: finalPurchases.length,
    sales: finalSales.length,
    deliveries: finalDeliveries.length,
    reportRows: materialReports.length,
    stock,
    receivedPurchase: { orderNo: purchase.orderNo, status: purchase.status, totalCost: Number(purchase.totalCost) },
    sale: { invoiceNo: sale.invoiceNo, totalAmount: Number(sale.totalAmount), paidAmount: Number(sale.paidAmount) },
    delivery: { deliveryNo: delivery.deliveryNo, status: delivery.status, cost: Number(delivery.cost) },
  },
}, null, 2));
