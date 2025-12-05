import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function getLatestLink() {
    const link = await prisma.magicLink.findFirst({
        where: {
            email: 'test-approval@test.com',
            expiresAt: { gte: new Date() }
        },
        orderBy: { createdAt: 'desc' }
    })

    if (link) {
        console.log(`http://localhost:3000/auth/magic-link/${link.token}`)
    } else {
        console.log('No valid link found')
    }

    await prisma.$disconnect()
}

getLatestLink()
