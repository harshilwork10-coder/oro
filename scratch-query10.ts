import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const loc = await prisma.location.findUnique({
      where: { id: 'cmny4mz9f0005hua2nhkh1cuz' },
      include: { franchise: true }
  });
  console.log('Location:', loc);
}

main().catch(console.error).finally(() => prisma.$disconnect());
