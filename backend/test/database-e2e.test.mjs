import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import pg from 'pg';
import provisioning from '../dist/common/database/tenant-schema-sql.js';

const urlA = process.env.TEST_TENANT_A_DATABASE_URL;
const urlB = process.env.TEST_TENANT_B_DATABASE_URL;
const enabled = Boolean(urlA && urlB);
const pools = enabled ? [new pg.Pool({ connectionString: urlA }), new pg.Pool({ connectionString: urlB })] : [];
const marker = randomUUID();

before(async () => {
  if (!enabled) return;
  await Promise.all([provisioning.applyCompanySchema(urlA), provisioning.applyCompanySchema(urlB)]);
});

after(async () => {
  await Promise.all(pools.map((pool) => pool.end()));
});

test('tenant provisioning installs the current schema version in both databases', { skip: !enabled }, async () => {
  const versions = await Promise.all(pools.map((pool) => pool.query(
    `SELECT "value" FROM "system_config" WHERE "key" = 'schema_version'`,
  )));
  for (const result of versions) {
    assert.equal(result.rows[0]?.value, String(provisioning.CURRENT_TENANT_SCHEMA_VERSION));
  }
});

test('tenant records remain isolated even when identifiers are identical', { skip: !enabled }, async () => {
  const userId = `e2e_user_${marker}`;
  const transactionId = `e2e_tx_${marker}`;
  await pools[0].query(
    `INSERT INTO "users" ("id","email","password_hash","name","role","updated_at")
     VALUES ($1,$2,'hash','E2E Owner','COMPANY_OWNER',CURRENT_TIMESTAMP)`,
    [userId, `owner-${marker}@example.test`],
  );
  await pools[0].query(
    `INSERT INTO "transactions" ("id","reference_id","type","status","description","amount","date","updated_at")
     VALUES ($1,$2,'INCOME','CLEARED','Isolation marker',42,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
    [transactionId, `ref_${marker}`],
  );

  const [tenantA, tenantB] = await Promise.all(pools.map((pool) => pool.query(
    `SELECT COUNT(*)::int AS count FROM "transactions" WHERE "id" = $1`,
    [transactionId],
  )));
  assert.equal(tenantA.rows[0].count, 1);
  assert.equal(tenantB.rows[0].count, 0);
});
