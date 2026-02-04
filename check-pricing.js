const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.franchiseSettings.findMany({
        take: 5,
        select: {
            pricingModel: true,
            showDualPricing: true,
            cardSurcharge: true,
            cardSurchargeType: true
        }
    });
    console.log('=== FranchiseSettings ===');
    console.log(JSON.stringify(settings, null, 2));

    // Also check BusinessConfig
    const configs = await prisma.businessConfig.findMany({
        take: 5,
        select: {
            pricingModel: true,
            showDualPricing: true,
            cardSurcharge: true,
            cardSurchargeType: true
        }
    });
    console.log('\n=== BusinessConfig ===');
    console.log(JSON.stringify(configs, null, 2));
}

main().then(() => prisma.$disconnect()).catch(e => {
    console.error(e);
    prisma.$disconnect();
});
