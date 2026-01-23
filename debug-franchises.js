const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Get ALL franchises and their service counts
    const franchises = await p.franchise.findMany({
        include: {
            franchisor: { select: { name: true } },
            _count: { select: { services: true, products: true } }
        }
    });

    console.log('=== Franchises and Services ===\n');
    for (const f of franchises) {
        console.log(`${f.name} (owned by: ${f.franchisor?.name || 'N/A'})`);
        console.log(`  Services: ${f._count.services}, Products: ${f._count.products}`);
    }

    // Check which franchisors have services (brand catalog)
    console.log('\n=== Check for Franchisor-Level Services ===');
    try {
        const franchisorServices = await p.service.groupBy({
            by: ['franchiseId'],
            _count: true
        });
        console.log('Services grouped by franchiseId:', franchisorServices);
    } catch (e) {
        console.log('Could not group services');
    }

    // Get locations and their franchises
    console.log('\n=== Locations ===');
    const locations = await p.location.findMany({
        include: {
            franchise: { select: { name: true } }
        }
    });
    for (const loc of locations) {
        console.log(`${loc.name} -> Franchise: ${loc.franchise?.name}`);
    }
}

main().catch(console.error).finally(() => p.$disconnect());
