const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({ 
      where: { name: { contains: 'Anti', mode: 'insensitive' } } 
  });
  console.log('Services with Anti:', services.map(s => ({ id: s.id, name: s.name, franchiseId: s.franchiseId, isGlobal: s.isGlobal })));
  
  const owner = await prisma.user.findFirst({
      where: { email: 'harmial@shubh.com' },
      include: {
          franchise: {
              include: {
                  franchisor: {
                      include: {
                          services: { select: { id: true, name: true, isGlobal: true } }
                      }
                  },
                  services: { select: { id: true, name: true } }
              }
          }
      }
  });
  
  if (owner) {
      console.log('Owner Franchise Servies:', owner.franchise?.services?.length);
      console.log('Owner Franchisor Services:', owner.franchise?.franchisor?.services?.length);
      const allServices = [
          ...(owner.franchise?.services || []),
          ...(owner.franchise?.franchisor?.services || [])
      ].filter(s => s.name.includes('Anti'));
      console.log('Anti services for owner:', allServices);
  } else {
      console.log('Owner not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
