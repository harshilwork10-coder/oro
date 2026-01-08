import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function generateNewMagicLink() {
    try {
        const email = 'verify@test.com'
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            console.error('User verify@test.com not found')
            return
        }

        const token = randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        await prisma.magicLink.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            }
        })

        const url = `http://localhost:3000/auth/magic-link/${token}`
        console.log(`NEW_MAGIC_LINK: ${url}`)

        const fs = require('fs')
        fs.writeFileSync('magic-link.txt', url)
        console.log('Magic link saved to magic-link.txt')

    } catch (error) {
        console.error('Error generating magic link:', error)
    } finally {
        await prisma.$disconnect()
    }
}

generateNewMagicLink()
