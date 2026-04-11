import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create BusinessConfig for Shubh Beauty franchisor with taxServices = false
const result = await prisma.businessConfig.create({
  data: {
    franchisorId: 'cmkkggtwg000213da0bio7rbo',
    taxServices: false,
    taxProducts: true
  }
});
console.log('Created BusinessConfig:', result);

await prisma.$disconnect();
