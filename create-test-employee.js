// create-test-employee.js - Creates a test employee with PIN 1234
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    // Hash the PIN
    const hashedPin = await bcrypt.hash('1234', 10);
    console.log('Hashed PIN for 1234:', hashedPin);

    // Find a franchise to attach to
    const franchise = await prisma.franchise.findFirst();
    if (!franchise) {
        console.log('No franchise found!');
        await prisma.$disconnect();
        return;
    }

    // Find a location
    const location = await prisma.location.findFirst();

    // Create or update test employee
    const testEmployee = await prisma.user.upsert({
        where: { email: 'testemployee@oro9.com' },
        update: { pin: hashedPin },
        create: {
            email: 'testemployee@oro9.com',
            name: 'Test Employee',
            role: 'EMPLOYEE',
            pin: hashedPin,
            franchiseId: franchise.id,
            locationId: location?.id
        }
    });

    console.log('Test employee created/updated:', testEmployee.id);
    console.log('Name:', testEmployee.name);
    console.log('Email:', testEmployee.email);
    console.log('PIN is set: ', testEmployee.pin ? 'YES' : 'NO');
    console.log('\nYou can now login with PIN: 1234');

    await prisma.$disconnect();
}

main().catch(console.error);
