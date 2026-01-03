const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enablePulse() {
    // Get all business configs
    const configs = await prisma.businessConfig.findMany();
    console.log('Found configs:', configs.length);

    // Update all to enable Pulse
    for (const config of configs) {
        await prisma.businessConfig.update({
            where: { id: config.id },
            data: {
                pulseSeatCount: 5,
                usesMobilePulse: true
            }
        });
        console.log(`Updated config ${config.id}`);
    }

    // If no configs exist, find franchisors and create them
    if (configs.length === 0) {
        const franchisors = await prisma.franchisor.findMany();
        console.log('Found franchisors:', franchisors.length);

        for (const franchisor of franchisors) {
            try {
                await prisma.businessConfig.create({
                    data: {
                        franchisorId: franchisor.id,
                        pulseSeatCount: 5,
                        usesMobilePulse: true
                    }
                });
                console.log(`Created config for franchisor ${franchisor.id}`);
            } catch (e) {
                console.log(`Config may already exist for ${franchisor.id}`);
            }
        }
    }

    console.log('Pulse enabled for all accounts!');
    await prisma.$disconnect();
}

enablePulse();
