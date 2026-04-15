const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.globalServiceCategory.findUnique({
      where: { id: 'cmny3g4s60005vrbjeyyn33rj' }
  });
  console.log('Category:', c);
}

main().catch(console.error).finally(() => prisma.$disconnect());
