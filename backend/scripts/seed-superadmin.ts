import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCentralDatabaseUrls } from '../src/common/database/database-url';

// Load environment from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { PrismaClient } from '../src/generated/central/client';

async function seed() {
  console.log('Seeding Super Admin and Default Subscription Plans into Central DB...');

  const centralDatabaseUrl = getCentralDatabaseUrls().directUrl;

  const pool = new Pool({
    connectionString: centralDatabaseUrl,
    max: 1,
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const adminEmail = process.env.E2E_SUPER_ADMIN_EMAIL || 'admin@maamulpro.com';
  const adminPassword = process.env.E2E_SUPER_ADMIN_PASSWORD || 'StrongPass@123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // 1. Seed Super Admin
  const admin = await prisma.centralAdmin.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: 'Super Admin User',
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Super Admin User',
    },
  });

  console.log(`Super Admin account ready: ${admin.email}`);

  // 2. Seed Default Plans
  const plans = [
    {
      key: 'BASIC',
      name: 'Basic Starter',
      description: 'Ideal for small firms and single site operations',
      priceMonthly: 49,
      priceYearly: 490,
      usersMax: 5,
      constructionMax: 2,
      propertiesMax: 10,
      features: {},
    },
    {
      key: 'PRO',
      name: 'Professional Business',
      description: 'Full workspace features for growing construction & real estate companies',
      priceMonthly: 149,
      priceYearly: 1490,
      usersMax: 25,
      constructionMax: 10,
      propertiesMax: 50,
      features: {},
    },
    {
      key: 'ENTERPRISE',
      name: 'Enterprise Unlimited',
      description: 'Unlimited scale with priority support and custom domain mapping',
      priceMonthly: 399,
      priceYearly: 3990,
      usersMax: 999,
      constructionMax: 999,
      propertiesMax: 999,
      features: {},
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        usersMax: plan.usersMax,
        constructionMax: plan.constructionMax,
        propertiesMax: plan.propertiesMax,
        features: plan.features,
      },
      create: {
        key: plan.key,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        usersMax: plan.usersMax,
        constructionMax: plan.constructionMax,
        propertiesMax: plan.propertiesMax,
        features: plan.features,
      },
    });
  }

  console.log('Default subscription plans (BASIC, PRO, ENTERPRISE) seeded.');
  await prisma.$disconnect();
  await pool.end();
}

seed().catch((e) => {
  console.error('Error seeding DB:', e);
  process.exit(1);
});
