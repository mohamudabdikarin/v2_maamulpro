import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('money and inventory workflows keep database-backed concurrency controls', async () => {
  const [payroll, materials, rentals, tenantSql] = await Promise.all([
    read('../src/modules/payroll/payroll.service.ts'),
    read('../src/modules/material-management/material-management.service.ts'),
    read('../src/modules/real-estate/real-estate.service.ts'),
    read('../src/common/database/tenant-schema-sql.ts'),
  ]);
  assert.match(tenantSql, /CREATE UNIQUE INDEX[^\n]+payrolls_year_month_active_key[^\n]+WHERE "deleted_at" IS NULL/);
  assert.match(payroll, /P2002|already exists/i);
  assert.match(materials, /quantity: \{ gte: quantity \}/);
  assert.match(materials, /quantity: \{ increment: direction \* quantity \}/);
  assert.match(materials, /Insufficient stock/i);
  assert.match(rentals, /FOR UPDATE/);
  assert.match(rentals, /concurrent claims on the same property serialize/);
});
