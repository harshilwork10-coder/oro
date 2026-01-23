const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Get station with REG2 (just paired)
    const stations = await p.station.findMany({
        include: {
            location: {
                include: {
                    franchise: {
                        include: {
                            franchisor: true
                        }
                    }
                }
            }
        }
    });

    for (const station of stations) {
        console.log(`\n=== Station: ${station.name} (${station.pairingCode}) ===`);
        console.log(`Status: ${station.pairingStatus}, Trusted: ${station.isTrusted}`);

        const loc = station.location;
        const franchise = loc?.franchise;
        const franchisor = franchise?.franchisor;

        console.log(`Location: ${loc?.name}`);
        console.log(`Franchise: ${franchise?.name} (ID: ${franchise?.id?.slice(-8)})`);
        console.log(`Franchisor: ${franchisor?.name} (ID: ${franchisor?.id?.slice(-8)})`);

        if (franchise?.id) {
            const services = await p.service.count({ where: { franchiseId: franchise.id } });
            console.log(`Services (franchise level): ${services}`);
        }

        if (franchisor?.id) {
            // Check if services exist at franchisor level
            const franchisorServices = await p.service.count({ where: { franchisorId: franchisor.id } });
            console.log(`Services (franchisor level): ${franchisorServices}`);
        }
    }

    // Check all services to see if they have franchisorId
    console.log('\n=== Sample Services ===');
    const services = await p.service.findMany({
        take: 5,
        select: { name: true, franchiseId: true, franchisorId: true }
    });
    services.forEach(s => console.log(`${s.name}: franchiseId=${s.franchiseId?.slice(-6)}, franchisorId=${s.franchisorId?.slice(-6) || 'null'}`));
}

main().catch(console.error).finally(() => p.$disconnect());
