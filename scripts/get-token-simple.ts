import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getToken() {
    try {
        const magicLink = await prisma.magicLink.findFirst({
            where: {
                user: {
                    email: 'verify@test.com'
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (magicLink) {
            const fs = require('fs')
            const path = require('path')
            const filePath = path.join(process.cwd(), 'token.txt')
            fs.writeFileSync(filePath, magicLink.token)
            console.error(`SUCCESS: Token saved to ${filePath}`)
        } else {
            console.error('ERROR: No magic link found for verify@test.com')
            // Check if user exists
            const user = await prisma.user.findUnique({ where: { email: 'verify@test.com' } })
            console.error(`User exists: ${!!user}`)
        }
    } catch (error) {
        console.error(error)
    } finally {
        await prisma.$disconnect()
    }
}

getToken()
