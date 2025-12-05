import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🗑️  Deleting all test franchisors...\n')

    // Delete all franchisors except the ones we need for testing
    const deleted = await prisma.franchisor.deleteMany({
        where: {
            name: {
                in: ['Multi-Location Business', 'CRM Test Company', 'POS Test Company']
            }
        }
    })

    console.log(`✅ Deleted ${deleted.count} franchisors`)

    // Also clean up orphaned users
    const deletedUsers = await prisma.user.deleteMany({
        where: {
            email: {
                in: ['owner@test.com', 'crm@test.com', 'pos@test.com']
            }
        }
    })

    console.log(`✅ Deleted ${deletedUsers.count} associated users`)
    console.log('\n✅ All test franchisors deleted!')
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
