import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('reports support comparisons, real exports, record links, and delivery verification', async () => {
  const [schema, sql, service, controller, cron, interceptor, reportsPage, schedulesPage] = await Promise.all([
    read('../prisma/tenant/schema.prisma'),
    read('../src/common/database/tenant-schema-sql.ts'),
    read('../src/modules/reports/reports.service.ts'),
    read('../src/modules/reports/reports.controller.ts'),
    read('../src/modules/cron/cron.service.ts'),
    read('../src/common/interceptors/transform.interceptor.ts'),
    read('../../frontend/src/pages/CoreReportsPage.tsx'),
    read('../../frontend/src/pages/ReportSchedulesPage.tsx'),
  ]);
  assert.match(sql, /CURRENT_TENANT_SCHEMA_VERSION = (?:2[2-9]|[3-9]\d)/);
  for (const field of ['lastRunAt', 'lastSuccessAt', 'lastFailureAt', 'lastError', 'lastDeliveryId']) assert.match(schema, new RegExp(field));
  assert.match(service, /compareReport/);
  assert.match(service, /summaryDelta/);
  assert.match(service, /application\/pdf/);
  assert.match(service, /application\/vnd\.ms-excel/);
  assert.match(controller, /export\/:reportId/);
  assert.match(interceptor, /instanceof StreamableFile/);
  assert.match(controller, /Format must be csv, xls, or pdf/);
  assert.match(cron, /lastDeliveryId: delivery\.id/);
  assert.match(cron, /lastFailureAt: now/);
  assert.match(reportsPage, />Excel<\/button>/);
  assert.match(reportsPage, /Period comparison/);
  assert.match(reportsPage, /rowTarget/);
  assert.match(schedulesPage, /Last delivery/);
});
