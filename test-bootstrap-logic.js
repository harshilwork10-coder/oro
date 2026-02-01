const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testBootstrap() {
    console.log('\n=== Testing Bootstrap API Logic Directly ===\n')

    // Get location with franchise and settings
    const location = await prisma.location.findUnique({
        where: { id: 'cmkj1vkq4000812c60yoc4q1d' },
        include: {
            franchise: {
                include: {
                    settings: true,
                    franchisor: true
                }
            }
        }
    })

    if (!location) {
        console.log('Location not found!')
        await prisma.$disconnect()
        return
    }

    console.log('--- Location ---')
    console.log('Location ID:', location.id)
    console.log('Location Name:', location.name)
    console.log('Franchise ID:', location.franchiseId)
    console.log('Franchise Name:', location.franchise?.name)

    console.log('\n--- Franchise Settings (what bootstrap reads) ---')
    const settings = location.franchise?.settings
    if (settings) {
        console.log('Settings ID:', settings.id)
        console.log('pricingModel:', settings.pricingModel)
        console.log('cardSurcharge:', settings.cardSurcharge)
        console.log('showDualPricing:', settings.showDualPricing)

        // This is the EXACT logic from bootstrap route
        const dualPricingEnabled = settings.pricingModel === 'DUAL_PRICING'
        const cashDiscountPercent = settings.cardSurcharge ? parseFloat(settings.cardSurcharge.toString()) : 4.0

        console.log('\n--- Computed Values (what API SHOULD return) ---')
        console.log('dualPricingEnabled:', dualPricingEnabled)
        console.log('cashDiscountPercent:', cashDiscountPercent)

        if (!dualPricingEnabled) {
            console.log('\n⚠️ PROBLEM: pricingModel is NOT "DUAL_PRICING"')
            console.log('Current value:', settings.pricingModel)
        } else {
            console.log('\n✅ Database is correct! pricingModel = DUAL_PRICING')
        }
    } else {
        console.log('\n❌ NO SETTINGS FOUND! This is the problem!')
    }

    await prisma.$disconnect()
}

testBootstrap()
