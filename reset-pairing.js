const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function resetPairing() {
    const result = await p.station.updateMany({
        where: { pairingCode: 'VHNWV6' },
        data: {
            pairingStatus: 'UNPAIRED',
            pairedDeviceId: null,
            pairedAt: null
        }
    });
    console.log('Reset result:', result);
}

resetPairing()
    .catch(console.error)
    .finally(() => p.$disconnect());
