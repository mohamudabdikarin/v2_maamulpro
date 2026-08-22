const baseUrl = process.env.E2E_API_URL || 'http://127.0.0.1:4000';
const email = process.env.E2E_SUPER_ADMIN_EMAIL;
const password = process.env.E2E_SUPER_ADMIN_PASSWORD;
if (!email || !password) throw new Error('E2E super-admin credentials are required');
const json = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${body.message || 'unknown error'}`);
  return body.data ?? body;
};
const login = await json('/api/auth/superadmin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
const adminHeaders = { authorization: `Bearer ${login.accessToken}` };
const companies = await json('/api/superadmin/companies', { headers: adminHeaders });
const rows = Array.isArray(companies) ? companies : companies.data || [];
const company = rows.find((row) => row.status === 'ACTIVE' && row.accessGranted) || rows.find((row) => row.status === 'ACTIVE') || rows[0];
if (!company) throw new Error('No company is available for tenant verification');
const grant = await json(`/api/superadmin/companies/${company.id}/impersonation`, { method: 'POST', headers: adminHeaders });
const tenant = await json('/api/auth/impersonation/exchange', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: grant.token }) });
const headers = { authorization: `Bearer ${tenant.accessToken}`, 'x-company-id': company.id };

const checks = [
  ['/health', {}], ['/health/ready', {}], ['/api/settings', { headers }], ['/api/settings/notifications', { headers }],
  ['/api/accounting/periods', { headers }], ['/api/reports/registry', { headers }],
  ['/api/reports/run/core-profit-summary?compareStartDate=2025-01-01&compareEndDate=2025-12-31', { headers }],
  ...(tenant.user.entitlements?.features?.construction ? [['/api/construction/contracts/workspace', { headers }]] : []),
  ...(tenant.user.entitlements?.features?.realEstate ? [['/api/real-estate/rentals/workspace', { headers }]] : []),
];
for (const [path, init] of checks) {
  const response = await fetch(`${baseUrl}${path}`, init);
  console.log(`${response.status} ${path}`);
  if (!response.ok) process.exitCode = 1;
}
for (const format of ['csv', 'xls', 'pdf']) {
  const response = await fetch(`${baseUrl}/api/reports/export/core-profit-summary?format=${format}`, { headers });
  const content = Buffer.from(await response.arrayBuffer());
  const valid = response.ok && content.length > 20 && (format !== 'pdf' || content.subarray(0, 5).toString() === '%PDF-');
  console.log(`${response.status} report export ${format} (${content.length} bytes${valid ? '' : ', invalid'})`);
  if (!valid) process.exitCode = 1;
}
