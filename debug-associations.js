const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Get stations with their location and franchise info
    const stations = await p.station.findMany({
        select: {
            id: true,
            name: true,
            pairingCode: true,
            pairingStatus: true,
            isTrusted: true,
            location: {
                select: {
                    id: true,
                    name: true,
                    franchise: {
                        select: { id: true, name: true }
                    }
                }
            }
        }
    });

    console.log('\n=== STATIONS ===');
    for (const s of stations) {
        console.log(`\nStation: ${s.name} (${s.id.slice(-8)})`);
        console.log(`  Pairing: ${s.pairingCode} | Status: ${s.pairingStatus} | Trusted: ${s.isTrusted}`);
        console.log(`  Location: ${s.location?.name} (${s.location?.id?.slice(-8) || 'N/A'})`);
        console.log(`  Franchise: ${s.location?.franchise?.name} (${s.location?.franchise?.id?.slice(-8) || 'N/A'})`);

        // Check services for this franchise
        if (s.location?.franchise?.id) {
            const serviceCount = await p.service.count({
                where: { franchiseId: s.location.franchise.id }
            });
            const productCount = await p.product.count({
                where: { franchiseId: s.location.franchise.id }
            });
            console.log(`  Services: ${serviceCount} | Products: ${productCount}`);
        }
    }

    // Summary of all services by franchise
    console.log('\n=== ALL SERVICES BY FRANCHISE ===');
    const franchises = await p.franchise.findMany({
        select: { id: true, name: true }
    });

    for (const f of franchises) {
        const services = await p.service.findMany({
            where: { franchiseId: f.id },
            select: { name: true }
        });
        console.log(`\n${f.name} (${f.id.slice(-8)}): ${services.length} services`);
        services.slice(0, 5).forEach(s => console.log(`  - ${s.name}`));
    }
}

main().catch(console.error).finally(() => p.$disconnect());
