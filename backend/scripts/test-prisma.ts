import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCentralDatabaseUrls } from '../src/common/database/database-url';

// Load environment from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { PrismaClient } from '../src/generated/central/client';

async function test() {
  const centralDatabaseUrl = getCentralDatabaseUrls().runtimeUrl;

  const pool = new Pool({
    connectionString: centralDatabaseUrl,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const email = 'admin@maamulpro.com';
    const admin = await prisma.centralAdmin.findFirst({
      where: { email },
    });
    console.log('Admin lookup:', admin ? { id: admin.id, email: admin.email } : null);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test().catch(console.error);
