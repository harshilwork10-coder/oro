/**
 * Fix user roles and franchiseId assignments for proper reporting
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('=== FIXING USER ROLES ===\n');

    // 1. PROVIDER should NOT have franchiseId
    await prisma.user.update({
        where: { email: 'admin@oro9.com' },
        data: { franchiseId: null }
    });
    console.log('✅ PROVIDER (admin@oro9.com): Removed franchiseId');

    // 2. Show current state
    console.log('\n=== CURRENT TEST ACCOUNTS ===\n');

    const users = await prisma.user.findMany({
        where: {
            email: { in: ['admin@oro9.com', 'salon@user.com', 'mike@shubh.com'] }
        },
        select: { email: true, role: true, franchiseId: true, password: true }
    });

    for (const u of users) {
        console.log(`${u.role}: ${u.email}`);
        console.log(`  franchiseId: ${u.franchiseId || 'null'}`);
        console.log(`  has password: ${u.password ? 'yes' : 'no'}\n`);
    }

    // 3. Show which franchisor owns what
    console.log('=== FRANCHISOR → FRANCHISE → LOCATION ===\n');

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
        console.log(`FRANCHISOR: ${fr.name} (owner: ${fr.owner?.email || 'no owner'})`);
        for (const f of fr.franchises) {
            console.log(`  └── FRANCHISE: ${f.name}`);
            for (const l of f.locations) {
                console.log(`      └── LOCATION: ${l.name}`);
            }
        }
        console.log('');
    }

    await prisma.$disconnect();
}

main();
