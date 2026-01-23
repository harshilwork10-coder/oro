const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const stations = await p.station.findMany({
        select: {
            id: true,
            name: true,
            pairingCode: true,
            pairingStatus: true,
            isTrusted: true,
            pairedDeviceId: true
        },
        take: 10
    });
    console.log('Stations in database:');
    console.log(JSON.stringify(stations, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
