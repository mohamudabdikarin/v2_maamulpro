const baseUrl = process.env.E2E_API_URL || 'http://127.0.0.1:4000';
const email = process.env.E2E_SUPER_ADMIN_EMAIL;
const password = process.env.E2E_SUPER_ADMIN_PASSWORD;
if (!email || !password) throw new Error('E2E super-admin credentials are required');

const login = await fetch(`${baseUrl}/api/auth/superadmin/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
});
const loginBody = await login.json().catch(() => ({}));
if (!login.ok || !loginBody?.data?.accessToken) throw new Error(`Super-admin login failed (${login.status})`);

const response = await fetch(`${baseUrl}/api/superadmin/sync-schemas`, {
  method: 'POST', headers: { authorization: `Bearer ${loginBody.data.accessToken}` },
});
const body = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(`Tenant schema sync failed (${response.status})`);
const result = body.data || body;
console.log(`Tenant schema sync: ${result.ok}/${result.total} succeeded; ${result.failed} failed`);
if (result.failed) {
  for (const detail of result.details || []) console.error(`${detail.name}: ${detail.error}`);
  process.exitCode = 1;
}
