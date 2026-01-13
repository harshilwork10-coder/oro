// Script to backfill existing products and services with dual pricing fields
// Run with: npx tsx scripts/backfill-dual-pricing.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Starting dual pricing backfill...\n')

    // Get all franchisors with their configs
    const franchisors = await prisma.franchisor.findMany({
        include: {
            config: true,
            franchises: true
        }
    })

    console.log(`Found ${franchisors.length} franchisors to process\n`)

    for (const franchisor of franchisors) {
        const config = franchisor.config as any
        const pricingModel = config?.pricingModel || 'STANDARD'
        const cardSurcharge = parseFloat(String(config?.cardSurcharge)) || 0

        console.log(`\n📦 Processing franchisor: ${franchisor.businessName}`)
        console.log(`   Pricing Model: ${pricingModel}`)
        console.log(`   Card Surcharge: ${cardSurcharge}%`)

        for (const franchise of franchisor.franchises) {
            console.log(`\n   🏪 Franchise: ${franchise.name}`)

            // Update Products
            const products = await prisma.product.findMany({
                where: { franchiseId: franchise.id }
            })

            let productUpdates = 0
            for (const product of products) {
                const cashPrice = Number(product.price)
                let cardPrice: number | null = null

                if (pricingModel === 'DUAL_PRICING') {
                    cardPrice = cashPrice * (1 + cardSurcharge / 100)
                }

                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        cashPrice: cashPrice,
                        cardPrice: cardPrice
                    } as any
                })
                productUpdates++
            }
            console.log(`      ✅ Updated ${productUpdates} products`)

            // Update Services
            const services = await prisma.service.findMany({
                where: { franchiseId: franchise.id }
            })

            let serviceUpdates = 0
            for (const service of services) {
                const cashPrice = Number(service.price)
                let cardPrice: number | null = null

                if (pricingModel === 'DUAL_PRICING') {
                    cardPrice = cashPrice * (1 + cardSurcharge / 100)
                }

                await prisma.service.update({
                    where: { id: service.id },
                    data: {
                        cashPrice: cashPrice,
                        cardPrice: cardPrice
                    } as any
                })
                serviceUpdates++
            }
            console.log(`      ✅ Updated ${serviceUpdates} services`)
        }
    }

    console.log('\n\n🎉 Dual pricing backfill complete!')
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
