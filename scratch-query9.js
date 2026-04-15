const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { buildPOSMenu } = require('./src/lib/pos/menuBuilder');

async function main() {
  const result = await buildPOSMenu('cmny4mz9f0005hua2nhkh1cuz');
  const services = result.services;
  console.log('Total services returned:', services.length);
  const facial = services.find(s => s.name === 'Anti-Ageing Facial');
  if (facial) {
    console.log('YES! Anti-Ageing Facial is returned in the API!');
    console.log(facial);
  } else {
    console.log('NO! Anti-Ageing Facial is NOT RETURNED!!!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
