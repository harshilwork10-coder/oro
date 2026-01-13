const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetDb() {
    console.log('Deleting all data...');

    // Delete in order to avoid FK constraints
    await prisma.auditLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.client.deleteMany();
    await prisma.service.deleteMany();
    await prisma.location.deleteMany();
    await prisma.franchise.deleteMany();
    await prisma.franchisor.deleteMany();
    await prisma.user.deleteMany();
    await prisma.provider.deleteMany();

    console.log('Creating admin...');

    // Create provider
    const provider = await prisma.provider.create({
        data: {
            id: 'provider-1',
            name: 'Oronext',
            isActive: true
        }
    });

    // Create admin user
    const hash = await bcrypt.hash('Admin123$', 10);
    await prisma.user.create({
        data: {
            email: 'admin@oronext.com',
            password: hash,
            name: 'Admin',
            role: 'PROVIDER',
            providerId: provider.id
        }
    });

    console.log('✅ Done! Admin user created: admin@oronext.com / Admin123$');
}

resetDb().catch(console.error).finally(() => prisma.$disconnect());
