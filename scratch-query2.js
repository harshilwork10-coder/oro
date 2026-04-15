const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({ 
      where: { name: { contains: 'Anti', mode: 'insensitive' } } 
  });
  console.log('Services:', services.map(s => ({ id: s.id, name: s.name, franchiseId: s.franchiseId, isGlobal: s.isGlobal })));
  
  const franchisor = await prisma.franchisor.findFirst({
      where: { email: 'harmial@shubh.com' },
      include: {
          services: { select: { id: true, name: true, isGlobal: true } },
          franchises: {
              select: {
                  id: true,
                  name: true,
                  services: { select: { id: true, name: true } }
              }
          }
      }
  });
  console.dir(franchisor, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
