const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const service = await prisma.service.findUnique({ where: { id: 'cmny3g580000vvrbjg30snigl' } });
  console.log('Service:', service);
  
  const product = await prisma.product.findUnique({ where: { id: 'cmny3g580000vvrbjg30snigl' } });
  console.log('Product:', product);
}

main().catch(console.error).finally(() => prisma.$disconnect());
