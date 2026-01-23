const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Find station with pairingCode 77XRD6VU
    const station = await p.station.findUnique({
        where: { pairingCode: '77XRD6VU' },
        include: {
            location: {
                include: {
                    franchise: true
                }
            }
        }
    });

    if (!station) {
        console.log('❌ Station with code 77XRD6VU NOT FOUND');

        // Show all stations
        const allStations = await p.station.findMany({
            select: { name: true, pairingCode: true, pairingStatus: true }
        });
        console.log('\nAll stations:', allStations);
        return;
    }

    console.log('Station:', station.name);
    console.log('Location:', station.location?.name);
    console.log('Franchise:', station.location?.franchise?.name);
    console.log('FranchiseId:', station.location?.franchise?.id);

    // Check services for this franchise
    const fid = station.location?.franchise?.id;
    if (fid) {
        const services = await p.service.count({ where: { franchiseId: fid } });
        const products = await p.product.count({ where: { franchiseId: fid } });
        console.log(`\nServices: ${services}`);
        console.log(`Products: ${products}`);

        if (services === 0) {
            console.log('\n⚠️ NO SERVICES for this franchise!');
            console.log('The franchisee may need to get menu from franchisor catalog.');

            // Check franchisor
            const franchise = await p.franchise.findUnique({
                where: { id: fid },
                include: { franchisor: true }
            });
            console.log('\nFranchisor:', franchise?.franchisor?.name);
        }
    }
}

main().catch(console.error).finally(() => p.$disconnect());
