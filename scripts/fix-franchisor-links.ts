/**
 * Fix data relationships so FRANCHISOR can see their locations
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('=== FIXING FRANCHISOR → LOCATION LINKS ===\n');

    // Get all franchises with their franchisor
    const franchises = await prisma.franchise.findMany({
        include: {
            franchisor: { select: { id: true, name: true } },
            locations: { select: { id: true, name: true, franchisorId: true } }
        }
    });

    for (const franchise of franchises) {
        if (!franchise.franchisorId) {
            console.log(`❌ Franchise "${franchise.name}" has no franchisor`);
            continue;
        }

        for (const location of franchise.locations) {
            if (!location.franchisorId) {
                await prisma.location.update({
                    where: { id: location.id },
                    data: { franchisorId: franchise.franchisorId }
                });
                console.log(`✅ Fixed: "${location.name}" → franchisorId set to ${franchise.franchisor?.name}`);
            } else {
                console.log(`✓ Already linked: "${location.name}" → ${franchise.franchisor?.name}`);
            }
        }
    }

    console.log('\n=== VERIFICATION ===\n');

    // Verify final state
    const franchisors = await prisma.franchisor.findMany({
        include: {
            owner: { select: { email: true } },
            franchises: {
                include: {
                    locations: { select: { name: true } }
                }
            }
        }
    });

    for (const fr of franchisors) {
        console.log(`FRANCHISOR: ${fr.name} (${fr.owner?.email})`);
        console.log(`  Franchises & Locations:`);
        for (const f of fr.franchises) {
            console.log(`    └── ${f.name}: ${f.locations.map((l: { name: string }) => l.name).join(', ') || 'none'}`);
        }
        console.log('');
    }

    // Also verify locations have franchisorId
    const locations = await prisma.location.findMany({
        select: { name: true, franchisorId: true, franchiseId: true }
    });
    console.log('=== ALL LOCATIONS ===');
    for (const loc of locations) {
        console.log(`${loc.name}: franchiseId=${loc.franchiseId}, franchisorId=${loc.franchisorId || 'NULL'}`);
    }

    await prisma.$disconnect();
}

main();
