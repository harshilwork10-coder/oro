const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Get all users
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, franchiseId: true }
    });
    console.log('=== USERS ===');
    console.log(JSON.stringify(users, null, 2));

    // Get all franchises
    const franchises = await prisma.franchise.findMany({
        select: { id: true, name: true }
    });
    console.log('\n=== FRANCHISES ===');
    console.log(JSON.stringify(franchises, null, 2));
}

main().finally(() => prisma.$disconnect());
