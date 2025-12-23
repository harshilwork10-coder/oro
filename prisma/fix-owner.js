const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fix() {
    // Link mike@liquor.com to their franchise
    const result = await prisma.user.update({
        where: { email: 'mike@liquor.com' },
        data: { franchiseId: 'cmjhifqh20007cz4icy42bp45' }
    })
    console.log('Updated mike@liquor.com:', result.franchiseId)
}

fix().catch(console.error).finally(() => prisma.$disconnect())
