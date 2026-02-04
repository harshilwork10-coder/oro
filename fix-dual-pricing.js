const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    // Find the franchise with trusted stations (nice llc)
    const franchise = await p.franchise.findFirst({
        where: {
            locations: { some: { stations: { some: { isTrusted: true } } } }
        }
    })

    if (!franchise) {
        console.log('No franchise with trusted stations!')
        return
    }

    console.log('Creating FranchiseSettings for:', franchise.name, '(ID:', franchise.id, ')')

    // Create settings with dual pricing enabled
    const settings = await p.franchiseSettings.upsert({
        where: { franchiseId: franchise.id },
        create: {
            franchiseId: franchise.id,
            pricingModel: 'DUAL_PRICING',
            showDualPricing: true,
            cardSurcharge: 3.99
        },
        update: {
            pricingModel: 'DUAL_PRICING',
            showDualPricing: true,
            cardSurcharge: 3.99
        }
    })

    console.log('\n=== SETTINGS CREATED ===')
    console.log('ID:', settings.id)
    console.log('pricingModel:', settings.pricingModel)
    console.log('showDualPricing:', settings.showDualPricing)
    console.log('cardSurcharge:', settings.cardSurcharge?.toString())
    console.log('\n✅ DUAL PRICING IS NOW ENABLED!')
    console.log('Restart the Android app and it should work!')
}

main().finally(() => p.$disconnect())
