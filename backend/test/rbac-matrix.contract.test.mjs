import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../src/common/database/registry.ts', import.meta.url), 'utf8');
const roleBlock = (role) => source.match(new RegExp(`${role}: \\[([\\s\\S]*?)\\n  \\],`))?.[1] || '';

test('specialist role templates remain isolated to their operational duties', () => {
  assert.match(roleBlock('RENTAL_OFFICER'), /PERMISSIONS\.RENTALS_READ/);
  assert.doesNotMatch(roleBlock('RENTAL_OFFICER'), /PERMISSIONS\.PAYROLL_APPROVE/);
  assert.match(roleBlock('SITE_ENGINEER'), /PERMISSIONS\.TASKS_UPDATE/);
  assert.doesNotMatch(roleBlock('SITE_ENGINEER'), /PERMISSIONS\.MATERIAL_SALES_CREATE/);
  assert.match(roleBlock('SALES_STAFF'), /PERMISSIONS\.MATERIAL_SALES_CREATE/);
  assert.doesNotMatch(roleBlock('SALES_STAFF'), /PERMISSIONS\.ACCOUNTING_POST/);
  assert.match(roleBlock('INVENTORY_OFFICER'), /PERMISSIONS\.MATERIALS_INVENTORY_UPDATE/);
  assert.doesNotMatch(roleBlock('INVENTORY_OFFICER'), /PERMISSIONS\.USERS_DELETE/);
});

test('permission resolution is fail-closed and direct denies override grants', async () => {
  const guard = await readFile(new URL('../src/common/guards/permissions.guard.ts', import.meta.url), 'utf8');
  assert.match(guard, /without an active tenant user, no tenant permissions are granted/);
  assert.match(guard, /direct\.effect === 'DENY'\) permissions\.delete/);
  assert.match(guard, /requiredPermissions\.every/);
  assert.match(guard, /anyOfPermissions\.some/);
});
