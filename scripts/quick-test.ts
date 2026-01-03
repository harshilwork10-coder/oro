import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function createTestFranchisor() {
    const email = 'newtest@test.com'

    try {
        const user = await prisma.user.create({
            data: {
                email,
                name: "Mike Testing",
                role: 'FRANCHISOR',
                image: `https://ui-avatars.com/api/?name=Mike+Testing&background=random`,
            }
        })

        await prisma.franchisor.create({
            data: {
                name: "mike testing",
                businessType: "BRAND_FRANCHISOR",
                ownerId: user.id,
            }
        })

        const token = randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await prisma.magicLink.create({
            data: {
                token,
                userId: user.id,
                email: user.email,
                expiresAt,
            }
        })

        console.log(`\n✅ Franchisor created!`)
        console.log(`📧 Email: ${email}`)
        console.log(`🔗 URL: http://localhost:3000/auth/magic-link/${token}\n`)

    } catch (error) {
        console.error('ERROR:', error)
    } finally {
        await prisma.$disconnect()
    }
}

createTestFranchisor()
