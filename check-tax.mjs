import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Find the franchise for Shubh Beauty
const loc = await prisma.location.findFirst({
  where: { name: { contains: 'Shubh' } },
  select: { franchiseId: true, name: true, franchise: { select: { franchisorId: true } } }
});
console.log('Location:', loc);

if (loc) {
  const config = await prisma.businessConfig.findFirst({
    where: { franchisorId: loc.franchise.franchisorId },
    select: { taxServices: true, taxProducts: true }
  });
  console.log('BusinessConfig:', config);

  const settings = await prisma.franchiseSettings.findFirst({
    where: { franchiseId: loc.franchiseId },
    select: { taxRate: true }
  });
  console.log('FranchiseSettings:', settings);
}

await prisma.$disconnect();
