import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDatabase() {
    console.log('🧹 Starting database cleanup...')
    console.log('⚠️  This will delete ALL data except the provider account!\n')

    try {
        // Keep track of the provider user
        const provider = await prisma.user.findUnique({
            where: { email: 'provider@test.com' }
        })

        if (!provider) {
            console.error('❌ Provider account not found!')
            return
        }

        console.log(`✓ Found provider account: ${provider.email}`)

        // Delete in correct order to avoid foreign key constraints

        console.log('\n🗑️  Deleting data...')

        // 1. Delete all magic links
        const deletedMagicLinks = await prisma.magicLink.deleteMany({
            where: { userId: { not: provider.id } }
        })
        console.log(`  ✓ Deleted ${deletedMagicLinks.count} magic links`)

        // 2. Delete CRM data
        await prisma.lead.deleteMany({})
        console.log(`  ✓ Deleted all leads`)

        await prisma.territory.deleteMany({})
        console.log(`  ✓ Deleted all territories`)

        // 3. Delete global catalogs
        await prisma.globalService.deleteMany({})
        console.log(`  ✓ Deleted all global services`)

        await prisma.globalProduct.deleteMany({})
        console.log(`  ✓ Deleted all global products`)

        // 4. Delete royalty configs
        await prisma.royaltyConfig.deleteMany({})
        console.log(`  ✓ Deleted all royalty configs`)

        // 5. Delete all franchises (this cascades to locations, employees, etc.)
        const deletedFranchises = await prisma.franchise.deleteMany({})
        console.log(`  ✓ Deleted ${deletedFranchises.count} franchises (cascaded to locations, employees, services)`)

        // 6. Delete all franchisors
        const deletedFranchisors = await prisma.franchisor.deleteMany({})
        console.log(`  ✓ Deleted ${deletedFranchisors.count} franchisors`)

        // 7. Delete all users EXCEPT the provider
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                id: { not: provider.id }
            }
        })
        console.log(`  ✓ Deleted ${deletedUsers.count} users (kept provider account)`)

        console.log('\n✅ Database cleanup complete!')
        console.log('\n📋 Remaining account:')
        console.log(`   Email: ${provider.email}`)
        console.log(`   Role: ${provider.role}`)
        console.log('\n🔑 Login credentials:')
        console.log(`   Email: provider@test.com`)
        console.log(`   Password: password123`)

    } catch (error) {
        console.error('❌ Error during cleanup:', error)
    } finally {
        await prisma.$disconnect()
    }
}

cleanupDatabase()
