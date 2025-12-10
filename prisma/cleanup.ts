import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Cleaning up Demo Data...')

    // Delete Transactions and Line Items
    const deletedLineItems = await prisma.transactionLineItem.deleteMany({})
    console.log(`Deleted ${deletedLineItems.count} Line Items`)

    const deletedTx = await prisma.transaction.deleteMany({})
    console.log(`Deleted ${deletedTx.count} Transactions`)

    // Delete CheckIns
    const deletedCheckIns = await prisma.checkIn.deleteMany({})
    console.log(`Deleted ${deletedCheckIns.count} Check-Ins`)

    // Delete Demo Clients (created by seed)
    const deletedClients = await prisma.client.deleteMany({
        where: {
            email: {
                contains: '@test.com'
            }
        }
    })
    console.log(`Deleted ${deletedClients.count} Demo Clients`)

    // Delete Services created by seed (General Category)
    // Be careful not to delete real services if user added any.
    // Seed used 'General' category.
    const generalCategory = await prisma.serviceCategory.findFirst({
        where: { name: 'General' }
    })

    if (generalCategory) {
        const deletedServices = await prisma.service.deleteMany({
            where: { categoryId: generalCategory.id }
        })
        console.log(`Deleted ${deletedServices.count} Demo Services`)

        await prisma.serviceCategory.delete({
            where: { id: generalCategory.id }
        })
    }

    console.log('✅ Cleanup Complete. Users and Locations preserved.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
