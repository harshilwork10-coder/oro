import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const id = 'cmio435sx0002nzu90eugv1kp'
    const client = await prisma.franchisor.findUnique({
        where: { id },
        include: { owner: true }
    })

    if (!client) {
        console.log('NOT_FOUND')
        return
    }

    const magicLinks = await prisma.magicLink.findMany({
        where: { userId: client.ownerId }
    })

    console.log(JSON.stringify({
        found: true,
        name: client.name,
        ownerId: client.ownerId,
        magicLinksCount: magicLinks.length
    }))
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
