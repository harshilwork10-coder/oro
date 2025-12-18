import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Script to delete all users except admin@oronex.com
async function cleanupUsers() {
    console.log('Starting user cleanup...')

    const adminEmail = 'admin@oronex.com'

    // Find the admin user
    const admin = await prisma.user.findUnique({
        where: { email: adminEmail }
    })

    if (!admin) {
        console.error(`Admin user ${adminEmail} not found! Aborting.`)
        process.exit(1)
    }

    console.log(`Found admin: ${admin.email} (${admin.id})`)

    // Count users to delete
    const usersToDelete = await prisma.user.count({
        where: {
            id: { not: admin.id }
        }
    })

    console.log(`Will delete ${usersToDelete} users (keeping ${adminEmail})`)

    // Delete related records first (due to foreign keys)
    console.log('Deleting related records...')

    // Delete in order of dependencies
    await prisma.notification.deleteMany({ where: { userId: { not: admin.id } } })
    await prisma.magicLink.deleteMany({ where: { userId: { not: admin.id } } })
    await prisma.session.deleteMany({ where: { userId: { not: admin.id } } })
    await prisma.account.deleteMany({ where: { userId: { not: admin.id } } })

    // Delete users
    const deleted = await prisma.user.deleteMany({
        where: {
            id: { not: admin.id }
        }
    })

    console.log(`Deleted ${deleted.count} users`)
    console.log(`Remaining user: ${adminEmail}`)
    console.log('Cleanup complete!')
}

cleanupUsers()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
