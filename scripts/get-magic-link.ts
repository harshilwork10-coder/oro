import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const link = await prisma.magicLink.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { user: true }
    })

    if (link) {
        console.log(`http://localhost:3000/auth/magic-link/${link.token}`)
    } else {
        console.log('NO_LINK_FOUND')
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
