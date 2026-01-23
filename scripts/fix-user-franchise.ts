/**
 * Check user-franchise connection for reports debugging
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n🔍 DEBUGGING USER-FRANCHISE CONNECTION\n');

    // Find OWNER/FRANCHISOR users
    const users = await prisma.user.findMany({
        where: { role: { in: ['FRANCHISOR', 'OWNER', 'PROVIDER'] } },
        select: { id: true, name: true, email: true, role: true, franchiseId: true }
    });

    console.log('Users with HQ access:');
    users.forEach(u => {
        console.log(`  - ${u.name || u.email} (${u.role})`);
        console.log(`    franchiseId: ${u.franchiseId || '❌ MISSING'}`);
    });

    // Find franchises
    const franchises = await prisma.franchise.findMany({
        select: { id: true, name: true }
    });

    console.log('\nFranchises:');
    franchises.forEach(f => {
        console.log(`  - ${f.name}: ${f.id}`);
    });

    // Check transactions per franchise
    console.log('\nTransactions per franchise (today):');
    for (const f of franchises) {
        const count = await prisma.transaction.count({
            where: {
                franchiseId: f.id,
                createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }
        });
        console.log(`  - ${f.name}: ${count} transactions`);
    }

    // Fix: Link first OWNER/FRANCHISOR user to first franchise if not linked
    const unlinkedUser = users.find(u => !u.franchiseId);
    if (unlinkedUser && franchises.length > 0) {
        console.log(`\n🔧 FIXING: Linking ${unlinkedUser.name || unlinkedUser.email} to ${franchises[0].name}`);
        await prisma.user.update({
            where: { id: unlinkedUser.id },
            data: { franchiseId: franchises[0].id }
        });
        console.log('✅ User now linked to franchise!');
    }

    console.log('\n✅ Done! Restart your session (log out and back in) for changes to take effect.\n');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
