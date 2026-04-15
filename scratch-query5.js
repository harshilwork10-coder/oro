const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const globalServices = await prisma.globalService.findMany({ 
      where: { name: { contains: 'Anti', mode: 'insensitive' } } 
  });
  console.log('GlobalServices:', globalServices.map(s => ({ id: s.id, name: s.name, franchisorId: s.franchisorId })));
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
