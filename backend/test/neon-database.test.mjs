import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
require('ts-node/register/transpile-only');

const {
  getDatabaseConnectionPair,
  isNeonDatabaseUrl,
} = require('../src/common/database/database-url.ts');
const {
  protectDatabaseUrl,
  revealDatabaseUrl,
} = require('../src/common/database/database-credentials.ts');
const { NeonManagementService } = require('../src/common/database/neon-management.service.ts');

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Neon URLs use pooling at runtime and direct endpoints for schema work', () => {
  const previousProvider = process.env.DATABASE_PROVIDER;
  delete process.env.DATABASE_PROVIDER;
  try {
    const pair = getDatabaseConnectionPair(
      'postgresql://owner:secret@ep-example.us-east-2.aws.neon.tech/tenant_alpha',
    );
    assert.equal(new URL(pair.runtimeUrl).hostname, 'ep-example-pooler.us-east-2.aws.neon.tech');
    assert.equal(new URL(pair.directUrl).hostname, 'ep-example.us-east-2.aws.neon.tech');
    assert.equal(new URL(pair.runtimeUrl).searchParams.get('sslmode'), 'require');
    assert.equal(new URL(pair.directUrl).searchParams.get('sslmode'), 'require');
    assert.equal(pair.isNeon, true);
    assert.equal(isNeonDatabaseUrl(pair.runtimeUrl), true);
  } finally {
    if (previousProvider === undefined) delete process.env.DATABASE_PROVIDER;
    else process.env.DATABASE_PROVIDER = previousProvider;
  }
});

test('tenant database URLs are encrypted and can be recovered with the deployment key', () => {
  const previousProvider = process.env.DATABASE_PROVIDER;
  const previousKey = process.env.TENANT_DATABASE_ENCRYPTION_KEY;
  process.env.DATABASE_PROVIDER = 'neon';
  process.env.TENANT_DATABASE_ENCRYPTION_KEY = 'a'.repeat(64);
  try {
    const raw = 'postgresql://owner:secret@ep-example-pooler.us-east-2.aws.neon.tech/tenant_alpha?sslmode=require';
    const stored = protectDatabaseUrl(raw, true);
    assert.match(stored, /^enc:v1:/);
    assert.equal(stored.includes('owner'), false);
    assert.equal(stored.includes('secret'), false);
    assert.equal(revealDatabaseUrl(stored), raw);
  } finally {
    if (previousProvider === undefined) delete process.env.DATABASE_PROVIDER;
    else process.env.DATABASE_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.TENANT_DATABASE_ENCRYPTION_KEY;
    else process.env.TENANT_DATABASE_ENCRYPTION_KEY = previousKey;
  }
});

test('automatic onboarding creates and resolves an isolated Neon tenant database', async () => {
  const keys = [
    'DATABASE_PROVIDER',
    'CENTRAL_DATABASE_URL',
    'CENTRAL_DATABASE_DIRECT_URL',
    'NEON_API_KEY',
    'NEON_PROJECT_ID',
    'NEON_BRANCH_ID',
    'NEON_DB_ROLE',
    'NEON_TENANT_BASE_URL',
    'NEON_TENANT_DATABASE_PREFIX',
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  const requests = [];
  Object.assign(process.env, {
    DATABASE_PROVIDER: 'neon',
    CENTRAL_DATABASE_URL: 'postgresql://owner:secret@ep-example-pooler.us-east-2.aws.neon.tech/central?sslmode=require',
    CENTRAL_DATABASE_DIRECT_URL: 'postgresql://owner:secret@ep-example.us-east-2.aws.neon.tech/central?sslmode=require',
    NEON_API_KEY: 'test-key',
    NEON_PROJECT_ID: 'test-project',
    NEON_BRANCH_ID: 'test-branch',
    NEON_DB_ROLE: 'owner',
    NEON_TENANT_BASE_URL: 'postgresql://owner:secret@ep-example.us-east-2.aws.neon.tech/central?sslmode=require',
    NEON_TENANT_DATABASE_PREFIX: 'tenant_',
  });
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), method: init.method, body: init.body });
    return init.method === 'DELETE'
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify({ database: { name: 'tenant_acme_co' } }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        });
  };

  try {
    const service = new NeonManagementService();
    const database = await service.resolveTenantDatabase('Acme-Co');
    assert.equal(database.databaseName, 'tenant_acme_co');
    assert.equal(database.createdByMaamulPro, true);
    assert.equal(new URL(database.runtimeUrl).hostname, 'ep-example-pooler.us-east-2.aws.neon.tech');
    assert.equal(new URL(database.directUrl).pathname, '/tenant_acme_co');
    assert.equal(requests[0].method, 'POST');
    assert.deepEqual(JSON.parse(requests[0].body), {
      database: { name: 'tenant_acme_co', owner_name: 'owner' },
    });

    await service.deleteCreatedDatabase(database);
    assert.equal(requests[1].method, 'DELETE');
    assert.match(requests[1].url, /\/databases\/tenant_acme_co$/);
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('Neon database services are singletons and credentials are not exposed by company APIs', async () => {
  const [databaseModule, appModule, superAdminService, provisioning, schemaSql, encryptionScript] = await Promise.all([
    read('../src/common/database/database.module.ts'),
    read('../src/app.module.ts'),
    read('../src/modules/superadmin/superadmin.service.ts'),
    read('../src/common/database/tenant-provisioning.service.ts'),
    read('../src/common/database/tenant-schema-sql.ts'),
    read('../scripts/encrypt-tenant-database-urls.ts'),
  ]);
  assert.match(databaseModule, /@Global\(\)/);
  assert.match(appModule, /DatabaseModule/);
  assert.match(superAdminService, /protectDatabaseUrl\(connections\.runtimeUrl/);
  assert.match(superAdminService, /const \{ dbUrl, users, \.\.\.safeCompany \} = company/);
  assert.match(superAdminService, /resetTokenHash/);
  assert.doesNotMatch(superAdminService, /include:\s*\{\s*company:\s*true\s*\}/);
  assert.match(provisioning, /applyCompanySchema\(connections\.directUrl\)/);
  assert.match(provisioning, /getTenantDb\(connections\.runtimeUrl\)/);
  assert.match(schemaSql, /const \{ directUrl \} = getDatabaseConnectionPair\(companyDbUrl\)/);
  assert.match(schemaSql, /connectionString:\s*directUrl/);
  assert.match(encryptionScript, /protectDatabaseUrl\(company\.dbUrl, true\)/);
});
