const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Sync from Shubh LLC franchisor to salon llc franchise
const SOURCE_FRANCHISOR_ID = 'cmkkggtwg000213da0bio7rbo' // Shubh LLC (has the catalog)
const TARGET_FRANCHISE_ID = 'cmkj1vklv000612c6ffttste1' // salon llc (employees here)

async function syncCatalogToFranchise() {
    console.log('🔄 Syncing Brand Catalog to salon llc Franchise...\n')

    // Get brand services from SOURCE franchisor
    const brandServices = await prisma.globalService.findMany({
        where: {
            franchisorId: SOURCE_FRANCHISOR_ID,
            isActive: true,
            isArchived: false
        },
        include: {
            category: true
        }
    })

    console.log(`📦 Brand Services from Shubh LLC: ${brandServices.length}`)

    // Get existing services at target franchise
    const existingServices = await prisma.service.findMany({
        where: { franchiseId: TARGET_FRANCHISE_ID }
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
                    franchiseId: TARGET_FRANCHISE_ID,
                    name: brandService.category.name
                }
            })

            if (!localCategory) {
                localCategory = await prisma.serviceCategory.create({
                    data: {
                        name: brandService.category.name,
                        franchiseId: TARGET_FRANCHISE_ID
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
                franchiseId: TARGET_FRANCHISE_ID,
                globalServiceId: brandService.id,
                categoryId,
                isAddOn: brandService.isAddOn
            }
        })

        console.log(`   ✅ ${brandService.name}`)
        created++
    }

    console.log(`\n   Created: ${created}, Skipped: ${skipped}`)
    console.log('\n✨ Sync complete!')
}

syncCatalogToFranchise()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
