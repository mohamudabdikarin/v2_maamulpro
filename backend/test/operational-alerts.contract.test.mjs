import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('operational alerts persist, reconcile, route, escalate, dismiss, and deliver digests', async () => {
  const [schema, sql, service, settings, controller, cron, page] = await Promise.all([
    read('../prisma/tenant/schema.prisma'),
    read('../src/common/database/tenant-schema-sql.ts'),
    read('../src/modules/settings/operational-alerts.service.ts'),
    read('../src/modules/settings/settings.service.ts'),
    read('../src/modules/settings/settings.controller.ts'),
    read('../src/modules/cron/cron.service.ts'),
    read('../../frontend/src/pages/NotificationsPage.tsx'),
  ]);
  assert.match(schema, /model OperationalAlert \{/);
  assert.match(schema, /model OperationalAlertRead \{/);
  for (const [type, permission] of [
    ['LOW_STOCK', 'materials_products.read'],
    ['OVERDUE_RENT', 'rentals.read'],
    ['PAYROLL_APPROVAL', 'payroll.approve'],
    ['OVERDUE_TASK', 'construction_tasks.read'],
    ['LEASE_EXPIRY', 'rentals.read'],
  ]) {
    assert.match(service, new RegExp(`type: '${type}'`));
    assert.match(service, new RegExp(`requiredPermission: '${permission.replace('.', '\\.')}'`));
  }
  assert.match(schema, /assigneeId\s+String\?/);
  assert.match(schema, /dismissedAt\s+DateTime\?/);
  assert.match(sql, /CURRENT_TENANT_SCHEMA_VERSION = (?:2[1-9]|[3-9]\d)/);
  assert.ok(sql.indexOf('ADD COLUMN IF NOT EXISTS "assignee_id"') < sql.indexOf('operational_alerts_assignee_id_resolved_at_idx'));
  assert.match(service, /resolvedAt: now/);
  assert.match(service, /assigneeId: task\.assigneeId/);
  assert.match(service, /escalatedAt: now/);
  assert.match(service, /dismissAlert/);
  assert.match(settings, /operationalAlerts\.reconcileTenant/);
  assert.match(controller, /notifications\/:id\/read/);
  assert.match(controller, /notifications\/:id\/dismiss/);
  assert.match(cron, /reconcileOperationalAlerts/);
  assert.match(cron, /processOperationalAlertDigests/);
  assert.match(page, />Dismiss<\/button>/);
});
