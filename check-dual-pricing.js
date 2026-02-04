const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    console.log('=== ALL FRANCHISES WITH SETTINGS ===')
    const franchises = await p.franchise.findMany({
        include: {
            settings: true,
            locations: {
                include: { stations: true }
            }
        }
    })

    for (const f of franchises) {
        const hasStations = f.locations.some(l => l.stations.length > 0)
        const hasTrustedStations = f.locations.some(l => l.stations.some(s => s.isTrusted))
        console.log(`\nFranchise: ${f.name}`)
        console.log(`  - Has FranchiseSettings: ${f.settings ? 'YES' : 'NO'}`)
        console.log(`  - Has Stations: ${hasStations}`)
        console.log(`  - Has Trusted Stations: ${hasTrustedStations}`)
        if (f.settings) {
            console.log(`  - pricingModel: ${f.settings.pricingModel}`)
            console.log(`  - showDualPricing: ${f.settings.showDualPricing}`)
        }
    }
}

main().finally(() => p.$disconnect())
