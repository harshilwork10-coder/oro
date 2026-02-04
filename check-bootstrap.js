const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Simulate what bootstrap API does

    // Find a location
    const location = await prisma.location.findFirst({
        include: {
            franchise: {
                include: {
                    settings: true
                }
            }
        }
    });

    if (!location) {
        console.log('No location found!');
        return;
    }

    console.log('Location:', location.name);
    console.log('Franchise:', location.franchise?.id);
    console.log('Settings:', location.franchise?.settings);

    const settings = location.franchise?.settings;

    const dualPricingEnabled = settings?.pricingModel === 'DUAL_PRICING';
    const cashDiscountPercent = settings?.cardSurcharge ? parseFloat(settings.cardSurcharge.toString()) : 4.0;

    console.log('\n=== Bootstrap would return ===');
    console.log('dualPricingEnabled:', dualPricingEnabled);
    console.log('cashDiscountPercent:', cashDiscountPercent);
}

main().then(() => prisma.$disconnect()).catch(e => {
    console.error(e);
    prisma.$disconnect();
});
