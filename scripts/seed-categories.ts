import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedDefaultCategories() {
    console.log('🏷️  Seeding default service categories...')

    const franchises = await prisma.franchise.findMany()

    const defaultCategories = ['THREADING', 'WAXING', 'SPA', 'ADDITIONS']

    for (const franchise of franchises) {
        console.log(`  Adding categories for ${franchise.name}...`)

        for (let i = 0; i < defaultCategories.length; i++) {
            const categoryName = defaultCategories[i]

            // Check if category already exists
            const existing = await prisma.serviceCategory.findFirst({
                where: {
                    name: categoryName,
                    franchiseId: franchise.id
                }
            })

            if (!existing) {
                await prisma.serviceCategory.create({
                    data: {
                        name: categoryName,
                        franchiseId: franchise.id,
                        sortOrder: i
                    }
                })
                console.log(`    ✓ Added ${categoryName}`)
            } else {
                console.log(`    - ${categoryName} already exists`)
            }
        }
    }

    console.log('✅ Default categories seeded!')
}

seedDefaultCategories()
    .catch((e) => {
        console.error('❌ Error seeding categories:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
