import dotenv from 'dotenv';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const email = process.env.E2E_TENANT_EMAIL;
if (!email) throw new Error('E2E_TENANT_EMAIL is required');

const require = createRequire(import.meta.url);
const { CentralPrismaService } = require('../dist/common/database/central-prisma.service.js');
const { revealDatabaseUrl } = require('../dist/common/database/database-credentials.js');
const { applyCompanySchema, CURRENT_TENANT_SCHEMA_VERSION } = require('../dist/common/database/tenant-schema-sql.js');

const central = new CentralPrismaService();
try {
  await central.onModuleInit();
  const company = await central.company.findFirst({
    where: { adminEmail: email },
    select: { name: true, dbUrl: true },
  });
  if (!company) throw new Error(`Tenant company was not found for ${email}`);
  await applyCompanySchema(revealDatabaseUrl(company.dbUrl));
  console.log(`Applied tenant schema v${CURRENT_TENANT_SCHEMA_VERSION} to ${company.name}`);
} finally {
  await central.onModuleDestroy();
}
