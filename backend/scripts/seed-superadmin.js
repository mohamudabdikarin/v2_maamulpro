const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../src/generated/central/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding Super Admin and Default Subscription Plans into Central DB...');

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
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`✅ Super Admin Account Ready: ${admin.email} / ${adminPassword}`);

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
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { key: plan.key },
      update: plan,
      create: plan,
    });
  }

  console.log('✅ Default Subscription Plans (BASIC, PRO, ENTERPRISE) seeded!');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Error seeding DB:', e);
  prisma.$disconnect();
  process.exit(1);
});
