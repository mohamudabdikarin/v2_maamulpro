import 'dotenv/config';

const baseUrl = process.env.E2E_API_URL || 'http://127.0.0.1:4000';
const email = process.env.E2E_SUPER_ADMIN_EMAIL;
const password = process.env.E2E_SUPER_ADMIN_PASSWORD;
const requestCount = Math.max(5, Number(process.env.E2E_LOAD_REQUESTS || 20));
const maximumP95Ms = Math.max(250, Number(process.env.E2E_LOAD_P95_MS || 3000));

if (!email || !password) throw new Error('E2E super-admin credentials are required');

const login = await fetch(`${baseUrl}/api/auth/superadmin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginBody = await login.json();
const token = loginBody?.data?.accessToken;
if (!login.ok || !token) throw new Error(`Load probe login failed (${login.status})`);

const timings = await Promise.all(Array.from({ length: requestCount }, async () => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/api/superadmin/metrics`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Metrics request failed (${response.status})`);
  await response.arrayBuffer();
  return performance.now() - startedAt;
}));

timings.sort((a, b) => a - b);
const p95 = timings[Math.ceil(timings.length * 0.95) - 1];
console.log(JSON.stringify({ requests: timings.length, p95Ms: Math.round(p95), maxMs: Math.round(timings.at(-1)) }));
if (p95 > maximumP95Ms) throw new Error(`Load probe p95 ${Math.round(p95)}ms exceeded ${maximumP95Ms}ms`);
