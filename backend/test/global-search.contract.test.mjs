import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('global search is authenticated and permission-scoped', async () => {
  const [controller, service, header, crudPage] = await Promise.all([
    read('../src/modules/settings/settings.controller.ts'),
    read('../src/modules/settings/settings.service.ts'),
    read('../../frontend/src/components/Layouts/Header.tsx'),
    read('../../frontend/src/pages/CrudPage.tsx'),
  ]);
  assert.match(controller, /@Get\('search'\)/);
  assert.match(controller, /this\.settings\.searchRecords\(db, query, user\)/);
  assert.match(service, /if \(text\.length < 2\) return \[\]/);
  for (const permission of ['projects.read', 'construction_tasks.read', 'construction_expenses.read', 'manpower.read', 'users.read', 'properties.read', 'deals.read', 'rentals.read', 'materials_products.read', 'material_customers.read', 'suppliers.read', 'purchases.read', 'material_sales.read', 'transportation.read', 'payroll.read', 'transactions.read', 'accounting.read']) {
    assert.ok(service.includes(`can('${permission}')`));
  }
  assert.match(header, /\/api\/settings\/search\?q=/);
  assert.match(header, /Searching records/);
  assert.match(service, /\?record=\$\{row\.id\}/);
  assert.match(crudPage, /const focusedRecord = searchParams\.get\('record'\)/);
  assert.match(crudPage, /api<Record<string, any>>\(`\$\{endpoint\}\/\$\{focusedRecord\}`\)/);
});
