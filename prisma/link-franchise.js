const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Link the salon owner to their franchise
    const result = await prisma.user.update({
        where: { email: 'admin@salon.com' },
        data: { franchiseId: 'cmk6ehh7j00041219jyhdadev' }
    });

    console.log('Updated user:', result.email, '-> franchiseId:', result.franchiseId);
    console.log('SUCCESS! User is now linked to franchise.');
}

main().finally(() => prisma.$disconnect());
