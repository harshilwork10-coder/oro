const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Reset using raw SQL - use UNPAIRED not PENDING
    await p.$executeRaw`
        UPDATE "Station" 
        SET "pairingStatus" = 'UNPAIRED', 
            "pairedDeviceId" = NULL, 
            "pairedAt" = NULL 
        WHERE "pairingCode" = '7XYX5844'
    `;

    console.log('✅ Station 7XYX5844 reset to UNPAIRED');
    console.log('Try pairing again from the Android emulator!');
}

main().finally(() => p.$disconnect());
