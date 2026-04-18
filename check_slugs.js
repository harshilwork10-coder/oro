const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const locs = await prisma.location.findMany({ select: { slug: true, name: true } });
  console.log(locs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
