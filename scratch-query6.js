const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gp = await prisma.globalProduct.findMany({ 
      where: { name: { contains: 'Anti', mode: 'insensitive' } } 
  });
  console.log('GlobalProducts:', gp.map(s => ({ id: s.id, name: s.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
