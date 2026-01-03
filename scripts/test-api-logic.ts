import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const id = 'cmio435sx0002nzu90eugv1kp'
    console.log(`[Test Script] Looking for franchisor with ID: "${id}"`)

    const franchisor = await prisma.franchisor.findUnique({
        where: { id },
        select: { ownerId: true, name: true }
    })

    console.log(`[Test Script] Search result:`, franchisor ? `Found (${franchisor.name})` : 'Not Found')

    if (!franchisor) {
        console.log('❌ Client not found in DB')
        return
    }

    const magicLink = await prisma.magicLink.findFirst({
        where: { userId: franchisor.ownerId },
        orderBy: { createdAt: 'desc' }
    })

    console.log(`[Test Script] Magic Link:`, magicLink ? `Found (${magicLink.token})` : 'Not Found')
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
