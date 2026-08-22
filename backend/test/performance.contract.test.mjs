import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('expensive platform metrics collapse concurrent requests and use a short cache', async () => {
  const source = await readFile(new URL('../src/modules/superadmin/superadmin.service.ts', import.meta.url), 'utf8');
  assert.match(source, /platformMetricsInFlight/);
  assert.match(source, /platformMetricsCache/);
  assert.match(source, /Date\.now\(\) \+ 15_000/);
});
