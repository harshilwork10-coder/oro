/**
 * Seed script for Brand Catalog - Salon Services
 * 
 * Run with: npx ts-node prisma/seed-brand-catalog.ts
 * 
 * NOTE: Update FRANCHISOR_ID below before running!
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ========================================
// IMPORTANT: Set your franchisor ID here
// ========================================
const FRANCHISOR_ID = 'cmkkggtwg000213da0bio7rbo'  // Shubh LLC

// Category and service data from your menu
const catalogData = [
    {
        category: 'THREADING',
        sortOrder: 1,
        services: [
            { name: 'Eyebrows', duration: 10, basePrice: 8 },
            { name: 'Upper & Lower Lips', duration: 10, basePrice: 7 },
            { name: 'Chin, Neck & Forehead', duration: 15, basePrice: 10 },
            { name: 'Side Burn Half/Full', duration: 15, basePrice: 12 },
            { name: 'Full Face (No Neck)', duration: 30, basePrice: 25 },
        ]
    },
    {
        category: 'WAXING',
        sortOrder: 2,
        services: [
            { name: 'Full Face Waxing (No Neck)', duration: 30, basePrice: 30 },
            { name: 'Arm Half/Full Waxing', duration: 30, basePrice: 25, priceMode: 'FROM' },
            { name: 'Under Arm Waxing', duration: 15, basePrice: 15 },
            { name: 'Leg Half/Full Waxing', duration: 45, basePrice: 35, priceMode: 'FROM' },
        ]
    },
    {
        category: 'SPA',
        sortOrder: 3,
        services: [
            { name: 'Express Facial', duration: 30, basePrice: 35 },
            { name: 'Deluxe Facial', duration: 60, basePrice: 65 },
            { name: 'Anti-Ageing Facial', duration: 60, basePrice: 75 },
            { name: 'Acne Facial', duration: 45, basePrice: 55 },
        ]
    },
    {
        category: 'ADDITIONS',
        sortOrder: 4,
        services: [
            { name: 'Eyebrow Tinting', duration: 15, basePrice: 12, isAddOn: true },
            { name: 'Henna Tattoo', duration: 30, basePrice: 20, isAddOn: true },
            { name: 'Natural/Full Eyelashes', duration: 60, basePrice: 80, priceMode: 'FROM' },
            { name: 'Touch-ups', duration: 30, basePrice: 25, isAddOn: true },
            { name: 'Eyelash Extension', duration: 90, basePrice: 120 },
        ]
    }
]

async function main() {
    console.log('🌱 Seeding Brand Catalog...\n')

    // Verify franchisor exists
    const franchisor = await prisma.franchisor.findUnique({
        where: { id: FRANCHISOR_ID }
    })

    if (!franchisor) {
        console.error('❌ Franchisor not found! Please update FRANCHISOR_ID in the script.')
        console.log('\nTo find your franchisor ID, run:')
        console.log('  npx prisma studio')
        console.log('Then look in the Franchisor table.')
        process.exit(1)
    }

    console.log(`📍 Franchisor: ${franchisor.name || franchisor.id}\n`)

    let categoriesCreated = 0
    let servicesCreated = 0

    for (const catData of catalogData) {
        // Create category
        const category = await prisma.globalServiceCategory.create({
            data: {
                franchisorId: FRANCHISOR_ID,
                name: catData.category,
                sortOrder: catData.sortOrder,
                isActive: true
            }
        })
        console.log(`📁 Created category: ${catData.category}`)
        categoriesCreated++

        // Create services in this category
        for (const svc of catData.services) {
            await prisma.globalService.create({
                data: {
                    franchisorId: FRANCHISOR_ID,
                    categoryId: category.id,
                    name: svc.name,
                    duration: svc.duration,
                    basePrice: svc.basePrice,
                    priceMode: svc.priceMode || 'FIXED',
                    commissionable: true,
                    isAddOn: svc.isAddOn || false,
                    isActive: true,
                    isArchived: false
                }
            })
            console.log(`   ✅ ${svc.name} - $${svc.basePrice} (${svc.duration} min)`)
            servicesCreated++
        }
        console.log('')
    }

    console.log('━'.repeat(40))
    console.log(`✨ Done! Created ${categoriesCreated} categories and ${servicesCreated} services.`)
    console.log('\nView at: /franchisor/catalog')
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
