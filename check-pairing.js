const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const station = await p.station.findFirst({
        where: { pairingCode: '7XYX5844' },
        select: {
            id: true,
            name: true,
            pairingCode: true,
            isTrusted: true,
            locationId: true
        }
    });

    if (station) {
        console.log('Station found:', JSON.stringify(station, null, 2));
    } else {
        console.log('Station with code 7XYX5844 NOT FOUND');

        // List all pairing codes
        const all = await p.station.findMany({
            select: { name: true, pairingCode: true }
        });
        console.log('\nAvailable stations:');
        console.table(all);
    }
}

main().finally(() => p.$disconnect());
