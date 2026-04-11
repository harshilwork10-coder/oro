import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const locations = await prisma.location.findMany({
  select: { id: true, name: true, slug: true },
  take: 10
});
console.table(locations);
await prisma.$disconnect();
