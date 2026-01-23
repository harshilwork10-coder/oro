const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    console.log('=== CHECKING USER-FRANCHISOR LINKS ===\n');

    // Find all users with franchisorId
    const usersWithFranchisor = await p.user.findMany({
        where: { franchisorId: { not: null } },
        select: { id: true, name: true, email: true, franchisorId: true }
    });

    console.log('Users with franchisorId:');
    for (const u of usersWithFranchisor) {
        const exists = await p.franchisor.findUnique({ where: { id: u.franchisorId } });
        console.log(`  - ${u.email} -> ${u.franchisorId} | ${exists ? 'EXISTS' : 'DELETED!'}`);
    }

    // Find franchisor owners
    const franchisors = await p.franchisor.findMany({
        include: { owner: true }
    });

    console.log('\nFranchisors and their owners:');
    for (const fr of franchisors) {
        console.log(`  - ${fr.name} | Owner: ${fr.owner?.email || 'NONE'}`);
    }

    // Find the FRANCHISOR role user
    const franchisorUsers = await p.user.findMany({
        where: { role: 'FRANCHISOR' }
    });

    console.log('\nUsers with FRANCHISOR role:');
    franchisorUsers.forEach(u => console.log(`  - ${u.email} (id: ${u.id})`));
}

check().finally(() => p.$disconnect());
