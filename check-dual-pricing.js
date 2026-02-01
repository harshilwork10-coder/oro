const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDualPricing() {
    console.log('\n=== Checking FranchiseSettings for DUAL_PRICING ===\n')

    const settings = await prisma.franchiseSettings.findMany({
        select: {
            id: true,
            franchiseId: true,
            pricingModel: true,
            cardSurcharge: true,
            showDualPricing: true
        }
    })

    console.log('Total FranchiseSettings records:', settings.length)
    settings.forEach(s => {
        console.log(`  FranchiseSettings ID: ${s.id}`)
        console.log(`    franchiseId: ${s.franchiseId}`)
        console.log(`    pricingModel: ${s.pricingModel}`)
        console.log(`    cardSurcharge: ${s.cardSurcharge}`)
        console.log(`    showDualPricing: ${s.showDualPricing}`)
        console.log('')
    })

    // Also check locations and their franchise connections
    console.log('\n=== Checking Locations -> Franchise connections ===\n')
    const locations = await prisma.location.findMany({
        take: 5,
        include: {
            franchise: {
                select: {
                    id: true,
                    name: true,
                    settings: {
                        select: {
                            pricingModel: true,
                            cardSurcharge: true
                        }
                    }
                }
            }
        }
    })

    locations.forEach(loc => {
        console.log(`Location: ${loc.name} (ID: ${loc.id})`)
        console.log(`  Franchise: ${loc.franchise?.name} (ID: ${loc.franchiseId})`)
        console.log(`  Franchise Settings pricingModel: ${loc.franchise?.settings?.pricingModel || 'NO SETTINGS'}`)
        console.log(`  Franchise Settings cardSurcharge: ${loc.franchise?.settings?.cardSurcharge || 'NO SETTINGS'}`)
        console.log('')
    })

    await prisma.$disconnect()
}

checkDualPricing()
