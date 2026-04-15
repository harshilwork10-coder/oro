import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const locationId = 'cmny4mz9f0005hua2nhkh1cuz';
  const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { franchise: true }
  })
  
  const franchiseId = location.franchiseId;
  const franchisorId = location.franchise?.franchisorId;
  
  const [globalServices, overrides] = await Promise.all([
      franchisorId ? prisma.globalService.findMany({
          where: { franchisorId, isArchived: false, isActive: true },
          include: { category: true }
      }) : Promise.resolve([]),
      prisma.locationServiceOverride.findMany({
          where: { locationId, isLocked: false }
      })
  ])
  
  console.log(`franchisorId: ${franchisorId}`);
  console.log(`GlobalServices: ${globalServices.length}`);
  console.log(`Overrides: ${overrides.length}`);
  
  let validCount = 0;
  for (const gs of globalServices) {
      const override = overrides.find(o => o.globalServiceId === gs.id)
      if (!override) continue;
      if (!override.isEnabled) continue;
      
      const hasExplicitLocationPrice = override.price !== null && override.price !== undefined
      const useBrandDefault = override.useBrandDefaultPrice === true
      if (!hasExplicitLocationPrice && !useBrandDefault) continue;
      
      validCount++;
  }
  console.log(`Valid: ${validCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
