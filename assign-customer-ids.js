/**
 * Bulk assign Customer IDs to all franchises
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('🔍 Finding franchises...\n');

    // Get all franchises - only select fields that definitely exist
    const franchises = await p.franchise.findMany({
        select: { id: true, name: true }
    });

    console.log(`Total franchises: ${franchises.length}`);

    // Use default Houston zip for development
    const defaultZip = '77001';
    let assigned = 0;

    for (const f of franchises) {
        try {
            // Generate sequential ID based on existing count
            const existing = await p.franchise.count({
                where: {
                    customerId: { not: null }
                }
            });

            const seq = existing + 1;
            const customerId = `${defaultZip}-${String(seq).padStart(4, '0')}`;

            await p.$executeRaw`UPDATE "Franchise" SET "customerId" = ${customerId} WHERE id = ${f.id} AND "customerId" IS NULL`;

            console.log(`✅ ${f.name}: Assigned ${customerId}`);
            assigned++;
        } catch (error) {
            console.error(`❌ ${f.name}: ${error.message}`);
        }
    }

    console.log(`\n📊 Assigned ${assigned} Customer IDs`);

    // Show results
    const results = await p.$queryRaw`SELECT name, "customerId" FROM "Franchise"`;
    console.log('\n📋 All Franchises:');
    console.table(results);
}

main().finally(() => p.$disconnect());
