import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.service.count({
      where: { franchiseId: 'cmny3qva50002r0jqug63sivb' }
  });
  console.log('Local services count:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
