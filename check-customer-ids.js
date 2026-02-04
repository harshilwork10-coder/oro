const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Check if ANY franchises exist first
    const total = await p.franchise.count();
    console.log('Total franchises:', total);

    // Check how many have customerId
    const withId = await p.franchise.count({ where: { customerId: { not: null } } });
    console.log('With customerId:', withId);

    // Get all franchises with their customerId status
    const all = await p.franchise.findMany({
        select: { id: true, name: true, customerId: true, storeZip: true },
        take: 10
    });
    console.log('\nAll Franchises:');
    console.table(all);
}

main().finally(() => p.$disconnect());
