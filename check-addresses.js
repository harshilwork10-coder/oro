const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Get locations with addresses
    const locations = await p.$queryRaw`
        SELECT l.name, l.address, f.name as franchise_name 
        FROM "Location" l 
        JOIN "Franchise" f ON l."franchiseId" = f.id
    `;
    console.log('Locations with addresses:');
    console.table(locations);
}

main().finally(() => p.$disconnect());
