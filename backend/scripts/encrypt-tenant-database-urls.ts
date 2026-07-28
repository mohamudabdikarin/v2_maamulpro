import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { protectDatabaseUrl } from '../src/common/database/database-credentials';
import { getCentralDatabaseUrls } from '../src/common/database/database-url';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { PrismaClient } from '../src/generated/central/client';

async function encryptTenantDatabaseUrls() {
  const pool = new Pool({
    connectionString: getCentralDatabaseUrls().directUrl,
    max: 1,
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const companies = await prisma.company.findMany({
      select: { id: true, dbUrl: true },
    });
    const pending = companies
      .filter((company) => company.dbUrl && !company.dbUrl.startsWith('enc:v1:'))
      .map((company) => ({
        id: company.id,
        protectedUrl: protectDatabaseUrl(company.dbUrl, true),
      }));

    await prisma.$transaction(
      pending.map((company) =>
        prisma.company.update({
          where: { id: company.id },
          data: { dbUrl: company.protectedUrl },
        }),
      ),
    );
    console.log(`Encrypted ${pending.length} legacy tenant database credential(s).`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

encryptTenantDatabaseUrls().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
