const baseUrl = process.env.E2E_API_URL || 'http://127.0.0.1:4000';
const email = process.env.E2E_SUPER_ADMIN_EMAIL;
const password = process.env.E2E_SUPER_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error('E2E_SUPER_ADMIN_EMAIL and E2E_SUPER_ADMIN_PASSWORD are required');
}

const checks = [];
const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  checks.push({ path, status: response.status });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

await request('/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'invalid@example.com', password: 'invalid-password' }),
});

const login = await request('/api/auth/superadmin/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

if (!login.response.ok) {
  const message = Array.isArray(login.body?.message) ? login.body.message.join(', ') : login.body?.message;
  throw new Error(`Super-admin login failed (${login.response.status})${message ? `: ${message}` : ''}`);
}
const token = login.body?.data?.accessToken;
if (!token) throw new Error('Login response did not include an access token');

for (const path of [
  '/api/superadmin/companies',
  '/api/superadmin/metrics',
  '/api/superadmin/account',
  '/api/superadmin/notifications',
]) {
  await request(path, { headers: { authorization: `Bearer ${token}` } });
}

for (const check of checks) console.log(`${check.status} ${check.path}`);

if (checks[0]?.status !== 401 || checks.slice(1).some((check) => check.status !== 200)) {
  process.exitCode = 1;
}
