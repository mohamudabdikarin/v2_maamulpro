const { PrismaClient } = require('./src/generated/central/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.centralAdmin.findFirst({
      where: { email: 'admin@maamulpro.com' }
    });
    console.log(admin);
  } catch (e) {
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
