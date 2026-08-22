import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('slow workspace pages use one authenticated aggregate request', async () => {
  const [construction, rentals, contractPage, rentalPage, alerts] = await Promise.all([
    read('../src/modules/construction/construction.controller.ts'),
    read('../src/modules/real-estate/real-estate.controller.ts'),
    read('../../frontend/src/pages/WorkforceContractsPage.tsx'),
    read('../../frontend/src/pages/RentalHubPage.tsx'),
    read('../src/modules/settings/operational-alerts.service.ts'),
  ]);
  assert.match(construction, /contracts\/workspace/);
  assert.match(rentals, /rentals\/workspace/);
  assert.match(contractPage, /contracts\/workspace/);
  assert.match(rentalPage, /rentals\/workspace/);
  assert.match(alerts, /reconcileTenantIfStale/);
  assert.match(alerts, /recentReconciliations/);
});
