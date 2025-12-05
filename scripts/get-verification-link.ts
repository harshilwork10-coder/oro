import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getMagicLink() {
    try {
        const magicLink = await prisma.magicLink.findFirst({
            where: {
                user: {
                    email: 'verify@test.com'
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: true
            }
        })

        if (magicLink) {
            const fs = require('fs')
            const path = require('path')
            const filePath = path.join(process.cwd(), 'token.txt')
            fs.writeFileSync(filePath, magicLink.token)
            console.log(`Token saved to ${filePath}`)
        } else {
            console.error('NO_LINK')
        }
    } catch (error) {
        console.error('Error fetching magic link:', error)
    } finally {
        await prisma.$disconnect()
    }
}

getMagicLink()
