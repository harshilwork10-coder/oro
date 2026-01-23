const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function cleanup() {
    console.log('=== CLEANING UP TEST DATA ===\n');

    // Keep only "Shubh beauty corp"
    const keepFranchisorId = 'cmkhpn09f0002v0dbwe9r2jnt';

    // Get franchises to delete
    const franchisesToDelete = await p.franchise.findMany({
        where: { franchisorId: { not: keepFranchisorId } }
    });

    console.log('Franchises to delete:', franchisesToDelete.map(f => f.name));

    // Delete them one by one
    for (const f of franchisesToDelete) {
        try {
            await p.franchise.delete({ where: { id: f.id } });
            console.log(`  Deleted: ${f.name}`);
        } catch (e) {
            console.log(`  Already deleted: ${f.name}`);
        }
    }

    // Delete franchisors except kept one
    const franchisorsToDelete = await p.franchisor.findMany({
        where: { id: { not: keepFranchisorId } }
    });

    console.log('\nFranchisors to delete:', franchisorsToDelete.map(f => f.name));

    for (const fr of franchisorsToDelete) {
        try {
            await p.franchisor.delete({ where: { id: fr.id } });
            console.log(`  Deleted: ${fr.name}`);
        } catch (e) {
            console.log(`  Could not delete ${fr.name}: ${e.message}`);
        }
    }

    // Delete maulik llc under kept franchisor
    try {
        const maulik = await p.franchise.findFirst({
            where: { name: { contains: 'maulik' } }
        });
        if (maulik) {
            await p.franchise.delete({ where: { id: maulik.id } });
            console.log('\nDeleted maulik llc');
        }
    } catch (e) {
        console.log('maulik llc already deleted');
    }

    console.log('\n=== REMAINING DATA ===');

    const franchisors = await p.franchisor.findMany();
    console.log('Franchisors:', franchisors.map(f => f.name));

    const franchises = await p.franchise.findMany();
    console.log('Franchises:', franchises.map(f => f.name));
}

cleanup()
    .catch(e => console.error('Error:', e.message))
    .finally(() => p.$disconnect());
