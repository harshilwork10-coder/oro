const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Get the station with full location details
    const station = await p.station.findUnique({
        where: { id: 'cmkq1hc5z0003jktgr11m21c3' },
        include: {
            location: true
        }
    });

    console.log('Station:', station?.name);
    console.log('Station locationId:', station?.locationId);

    if (station?.location) {
        console.log('Location found:', station.location.name);
        console.log('Location ID:', station.location.id);
    } else {
        console.log('!!! LOCATION NOT FOUND !!!');

        // Get all locations
        const locations = await p.location.findMany({
            select: { id: true, name: true }
        });
        console.log('\nAll locations in database:');
        locations.forEach(l => console.log(`  ${l.name}: ${l.id}`));
    }
}

main().catch(console.error).finally(() => p.$disconnect());
