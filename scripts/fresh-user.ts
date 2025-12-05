import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function createFreshUser() {
    const timestamp = Date.now()
    const email = `franchisor${timestamp}@test.com`

    try {
        // Create User
        const user = await prisma.user.create({
            data: {
                email,
                name: "Fresh Test User",
                role: 'FRANCHISOR',
                image: `https://ui-avatars.com/api/?name=Fresh+Test&background=random`,
            }
        })

        // Create Franchisor Profile
        await prisma.franchisor.create({
            data: {
                name: "Fresh Test Business",
                businessType: "BRAND_FRANCHISOR",
                ownerId: user.id,
            }
        })

        // Create Magic Link
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

        const url = `http://localhost:3000/auth/magic-link/${token}`
        console.log(`\n✅ Fresh user created!`)
        console.log(`📧 Email: ${email}`)
        console.log(`🔗 URL: ${url}`)
        console.log(`\n`)

    } catch (error) {
        console.error('ERROR:', error)
    } finally {
        await prisma.$disconnect()
    }
}

createFreshUser()
