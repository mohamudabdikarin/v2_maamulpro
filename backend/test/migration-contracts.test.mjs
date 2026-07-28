import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('tenant controllers declare permission contracts for migrated business routes', async () => {
  const controllers = await Promise.all([
    read('../src/modules/construction/construction.controller.ts'),
    read('../src/modules/real-estate/real-estate.controller.ts'),
    read('../src/modules/material-management/material-management.controller.ts'),
    read('../src/modules/financials/financials.controller.ts'),
    read('../src/modules/payroll/payroll.controller.ts'),
    read('../src/modules/staff/staff.controller.ts'),
    read('../src/modules/reports/reports.controller.ts'),
  ]);
  const source = controllers.join('\n');
  const requiredPermissions = [
    'projects.read',
    'construction_tasks.read',
    'construction_expenses.read',
    'construction_inventory.read',
    'manpower.read',
    'workforce_contracts.read',
    'properties.read',
    'clients.read',
    'deals.read',
    'rentals.read',
    'materials_products.read',
    'suppliers.read',
    'purchases.read',
    'material_sales.read',
    'transportation.read',
    'financials.read',
    'payroll.read',
    'users.read',
    'reports.read',
  ];
  for (const permission of requiredPermissions) {
    assert.match(source, new RegExp(`RequirePermissions\\('${permission.replace('.', '\\.')}\\'\\)`), permission);
  }
});

test('Vristo routes expose every migrated business workspace', async () => {
  const routes = await read('../../frontend/src/router/routes.tsx');
  const paths = [
    '/app/staff',
    '/app/financials',
    '/app/payroll',
    '/app/construction/projects',
    '/app/construction/expenses',
    '/app/construction/inventory',
    '/app/construction/contracts',
    '/app/real-estate/properties',
    '/app/real-estate/clients',
    '/app/real-estate/deals',
    '/app/real-estate/rental-contracts',
    '/app/real-estate/rent-payments',
    '/app/materials/inventory',
    '/app/materials/suppliers',
    '/app/materials/purchases',
    '/app/materials/sales',
    '/app/materials/transportation',
    '/app/reports',
    '/app/report-schedules',
    '/app/roles',
    '/app/settings',
    '/superadmin/companies',
    '/superadmin/plans',
    '/superadmin/billing',
  ];
  for (const path of paths) assert.ok(routes.includes(`path: '${path}'`), path);
});

test('subscription plans are enforced across billing, API access and tenant navigation', async () => {
  const [schema, lifecycle, guard, middleware, sidebar, appShell] = await Promise.all([
    read('../prisma/central/schema.prisma'),
    read('../src/common/subscriptions/subscription-lifecycle.service.ts'),
    read('../src/common/guards/tenant-access.guard.ts'),
    read('../src/common/middleware/tenant-resolver.middleware.ts'),
    read('../../frontend/src/components/Layouts/Sidebar.tsx'),
    read('../../frontend/src/components/maamulpro/AppShell.tsx'),
  ]);
  assert.match(schema, /entitlements\s+Json/);
  assert.match(schema, /entitlementSnapshot\s+Json/);
  assert.match(schema, /enum InvoiceStatus[\s\S]*OVERDUE[\s\S]*EXPIRED/);
  assert.match(lifecycle, /assignSubscription[\s\S]*status:\s*'PENDING'/);
  assert.match(lifecycle, /markInvoicePaid[\s\S]*status:\s*'ACTIVE'/);
  assert.match(lifecycle, /reconcileBillingLifecycle/);
  assert.match(guard, /subscriptionExpiresAt/);
  assert.match(guard, /features\.payroll/);
  assert.match(guard, /features\.advancedReports/);
  assert.match(middleware, /subscriptionEntitlements\.fromCompany/);
  assert.match(sidebar, /group\.feature/);
  assert.match(appShell, /\/app\/construction/);
  assert.match(appShell, /\/app\/no-access/);
});

test('capacity limits are checked at every supported creation boundary', async () => {
  const [staff, construction, realEstate] = await Promise.all([
    read('../src/modules/staff/staff.service.ts'),
    read('../src/modules/construction/construction.service.ts'),
    read('../src/modules/real-estate/real-estate.service.ts'),
  ]);
  assert.match(staff, /withUserQuota\(companyId/);
  assert.match(construction, /withinTenantQuota\([\s\S]*'constructionProjects'/);
  assert.match(realEstate, /withinTenantQuota\([\s\S]*'properties'/);
});

test('security baseline remains globally registered', async () => {
  const appModule = await read('../src/app.module.ts');
  const main = await read('../src/main.ts');
  assert.match(appModule, /APP_GUARD[\s\S]*JwtAuthGuard/);
  assert.match(appModule, /APP_GUARD[\s\S]*PermissionsGuard/);
  assert.match(main, /forbidNonWhitelisted:\s*true/);
  assert.match(main, /CORS_ALLOWED_ORIGINS/);
});

test('production integrations are wired into the Nest cutover', async () => {
  const [appModule, auth, cron, provisioning, uploads, email] = await Promise.all([
    read('../src/app.module.ts'),
    read('../src/modules/auth/auth.service.ts'),
    read('../src/modules/cron/cron.service.ts'),
    read('../src/common/database/tenant-provisioning.service.ts'),
    read('../src/modules/uploads/uploads.service.ts'),
    read('../src/common/email/resend-email.service.ts'),
  ]);
  assert.match(appModule, /UploadsModule/);
  assert.match(appModule, /EmailModule/);
  assert.match(cron, /processDueReportSchedules/);
  assert.match(auth, /ResendEmailService/);
  assert.match(cron, /ResendEmailService/);
  assert.match(email, /resend\.emails\.send/);
  assert.match(provisioning, /applyCompanySchema/);
  assert.match(provisioning, /syncPermissionsToDb/);
  assert.match(uploads, /@vercel\/blob/);
});
