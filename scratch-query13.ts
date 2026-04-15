import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
      await prisma.transaction.create({
          data: {
              franchiseId: 'cmny3qva50002r0jqug63sivb',
              locationId: 'cmny4mz9f0005hua2nhkh1cuz',
              status: 'COMPLETED',
              paymentMethod: 'CASH',
              subtotal: 85,
              tax: 0,
              total: 85,
              number: 'TEST-123',
              lineItems: {
                  create: [
                      {
                          type: 'SERVICE',
                          quantity: 1,
                          price: 85,
                          total: 85,
                          serviceId: 'cmny3g580000vvrbjg30snigl', // This is a GlobalService ID!
                          serviceNameSnapshot: 'Anti-Ageing Facial'
                      }
                  ]
              }
          }
      })
      console.log('SUCCESS - No foreign key error!');
  } catch (e) {
      console.error('FAILED:', e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
