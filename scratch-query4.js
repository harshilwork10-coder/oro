const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({ 
      where: { name: { contains: 'Anti', mode: 'insensitive' } } 
  });
  console.log('Services with Anti:', services.map(s => ({ id: s.id, name: s.name, franchiseId: s.franchiseId, franchisorId: s.franchisorId, isGlobal: s.isGlobal })));
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
