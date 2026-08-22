import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('production health, request tracing and operations guidance remain wired', async () => {
  const [controller, app, main, filter, monitor, runbook] = await Promise.all([
    read('../src/modules/operations/operations.controller.ts'),
    read('../src/app.module.ts'),
    read('../src/main.ts'),
    read('../src/common/filters/http-exception.filter.ts'),
    read('../src/common/interceptors/request-monitoring.interceptor.ts'),
    read('../../docs/OPERATIONS-RUNBOOK.md'),
  ]);
  assert.match(controller, /@Controller\('health'\)/);
  assert.match(controller, /SELECT 1/);
  assert.match(app, /OperationsModule/);
  assert.match(app, /RequestMonitoringInterceptor/);
  assert.match(main, /enableShutdownHooks/);
  assert.match(filter, /requestId/);
  assert.match(monitor, /slow_http_request/);
  assert.match(runbook, /Restore drill/);
});
