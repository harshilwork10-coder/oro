const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const FRANCHISOR_ID = 'cmkkggtwg000213da0bio7rbo' // Shubh LLC

async function syncCatalogToFranchises() {
    console.log('🔄 Syncing Brand Catalog to Franchises...\n')

    // Get franchisor
    const franchisor = await prisma.franchisor.findUnique({
        where: { id: FRANCHISOR_ID }
    })

    if (!franchisor) {
        console.error('❌ Franchisor not found')
        return
    }

    console.log(`📍 Franchisor: ${franchisor.name}`)

    // Get all franchises under this franchisor
    const franchises = await prisma.franchise.findMany({
        where: { franchisorId: FRANCHISOR_ID }
    })

    console.log(`📍 Franchises: ${franchises.length}`)

    // Get all brand services
    const brandServices = await prisma.globalService.findMany({
        where: {
            franchisorId: FRANCHISOR_ID,
            isActive: true,
            isArchived: false
        },
        include: {
            category: true
        }
    })

    console.log(`📦 Brand Services: ${brandServices.length}\n`)

    // For each franchise
    for (const franchise of franchises) {
        console.log(`\n📍 Syncing to: Franchise ${franchise.id}`)

        // Get existing services at this franchise
        const existingServices = await prisma.service.findMany({
            where: { franchiseId: franchise.id }
        })

        const existingGlobalIds = new Set(
            existingServices.filter(s => s.globalServiceId).map(s => s.globalServiceId)
        )

        console.log(`   Existing services: ${existingServices.length}`)

        let created = 0
        let skipped = 0

        // For each brand service, create local Service if not exists
        for (const brandService of brandServices) {
            if (existingGlobalIds.has(brandService.id)) {
                skipped++
                continue
            }

            // Get or create local ServiceCategory
            let categoryId = null
            if (brandService.category) {
                let localCategory = await prisma.serviceCategory.findFirst({
                    where: {
                        franchiseId: franchise.id,
                        name: brandService.category.name
                    }
                })

                if (!localCategory) {
                    localCategory = await prisma.serviceCategory.create({
                        data: {
                            name: brandService.category.name,
                            franchiseId: franchise.id
                        }
                    })
                    console.log(`   📁 Created category: ${localCategory.name}`)
                }
                categoryId = localCategory.id
            }

            // Create the local Service
            await prisma.service.create({
                data: {
                    name: brandService.name,
                    description: brandService.description,
                    duration: brandService.duration,
                    price: brandService.basePrice,
                    franchiseId: franchise.id,
                    globalServiceId: brandService.id,
                    categoryId,
                    isAddOn: brandService.isAddOn
                }
            })

            console.log(`   ✅ ${brandService.name}`)
            created++
        }

        console.log(`   Created: ${created}, Skipped: ${skipped}`)
    }

    console.log('\n✨ Sync complete!')
}

syncCatalogToFranchises()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
