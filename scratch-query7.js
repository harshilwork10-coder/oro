const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const overrides = await prisma.locationServiceOverride.findMany({
      where: { globalService: { name: { contains: 'Anti', mode: 'insensitive' } } },
      include: { globalService: true }
  });
  console.log('Overrides for Anti-Ageing Facial:', overrides);
}

main().catch(console.error).finally(() => prisma.$disconnect());
