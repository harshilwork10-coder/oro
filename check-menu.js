const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Get all franchises
    const franchises = await p.franchise.findMany({
        select: { id: true, name: true },
        take: 5
    });
    console.log('Franchises:', franchises);

    if (franchises.length > 0) {
        const fid = franchises[0].id;

        // Count services
        const serviceCount = await p.service.count({ where: { franchiseId: fid } });
        console.log(`\nServices for ${franchises[0].name}: ${serviceCount}`);

        // Count products  
        const productCount = await p.product.count({ where: { franchiseId: fid } });
        console.log(`Products for ${franchises[0].name}: ${productCount}`);

        // Get sample services
        const sampleServices = await p.service.findMany({
            where: { franchiseId: fid },
            select: { id: true, name: true, price: true },
            take: 3
        });
        console.log('\nSample services:', sampleServices);

        // Get sample products
        const sampleProducts = await p.product.findMany({
            where: { franchiseId: fid },
            select: { id: true, name: true, price: true },
            take: 3
        });
        console.log('Sample products:', sampleProducts);
    }
}

main().catch(console.error).finally(() => p.$disconnect());
