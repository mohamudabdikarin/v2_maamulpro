import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const superadmin = await readFile(new URL('../src/modules/superadmin/superadmin.service.ts', import.meta.url), 'utf8');
const auth = await readFile(new URL('../src/modules/auth/auth.service.ts', import.meta.url), 'utf8');

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
