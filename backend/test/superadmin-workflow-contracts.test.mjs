import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const superadmin = await readFile(new URL('../src/modules/superadmin/superadmin.service.ts', import.meta.url), 'utf8');
const auth = await readFile(new URL('../src/modules/auth/auth.service.ts', import.meta.url), 'utf8');
const permissionsGuard = await readFile(new URL('../src/common/guards/permissions.guard.ts', import.meta.url), 'utf8');
const tenantGuard = await readFile(new URL('../src/common/guards/tenant-access.guard.ts', import.meta.url), 'utf8');
const apiClient = await readFile(new URL('../../frontend/src/lib/api.ts', import.meta.url), 'utf8');
const impersonationPage = await readFile(new URL('../../frontend/src/pages/auth/ImpersonationPage.tsx', import.meta.url), 'utf8');

test('onboarding cannot grant access before a dated subscription is configured', () => {
  assert.match(superadmin, /status: 'PENDING_SETUP',[\s\S]*subscriptionStatus: 'PENDING',[\s\S]*accessGranted: false/);
  assert.match(superadmin, /if \(hasSubscriptionAccess\(company\)\)/);
});

test('failed managed onboarding compensates the external database creation', () => {
  assert.match(superadmin, /disconnectTenant\(neonDatabase\.runtimeUrl\)[\s\S]*deleteCreatedDatabase\(neonDatabase\)/);
  assert.match(superadmin, /await this\.neonManagement\.deleteCreatedDatabase\(neonDatabase\)/);
  assert.doesNotMatch(superadmin, /deleteCreatedDatabase\(neonDatabase\)\.catch\(\(\) => undefined\)/);
});

test('impersonation grants are atomically consumed and do not revoke owner sessions on logout', () => {
  assert.match(auth, /impersonationGrant\.updateMany\([\s\S]*usedAt: null[\s\S]*usedAt: now/);
  assert.match(auth, /if \(user\?\.isImpersonating\) \{[\s\S]*return \{ loggedOut: true \}/);
});

test('impersonation bypasses tenant RBAC but remains bound to the granted company', () => {
  assert.match(permissionsGuard, /user\.isSuperAdmin \|\| user\.isImpersonating/);
  assert.match(tenantGuard, /if \(!user\.isSuperAdmin && \(!user\.companyId \|\| user\.companyId !== tenant\.companyId\)\)/);
  assert.match(tenantGuard, /if \(!user\.isSuperAdmin && !user\.isImpersonating\)/);
});

test('impersonation access is memory-only and cannot survive reload or tab closure', () => {
  assert.match(apiClient, /if \(session\.user\.isImpersonating\) \{[\s\S]*volatileSession = session[\s\S]*sessionStorage\.removeItem[\s\S]*localStorage\.removeItem/);
  assert.match(apiClient, /if \(stored\?\.user\.isImpersonating\) \{[\s\S]*return null/);
  assert.match(impersonationPage, /navigate\('\/app\/dashboard', \{ replace: true \}\)/);
  assert.match(auth, /accessToken: this\.jwtService\.sign\(payload, \{ expiresIn: 10 \* 60 \}\)/);
});
