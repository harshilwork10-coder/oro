import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function createTestUser() {
    const email = 'test-approval@test.com'

    try {
        // Create User
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                name: "Test Approval User",
                role: 'FRANCHISOR',
                image: `https://ui-avatars.com/api/?name=Test+Approval&background=random`,
            }
        })

        // Create Franchisor Profile (defaults to PENDING)
        await prisma.franchisor.upsert({
            where: { ownerId: user.id },
            update: {},
            create: {
                name: "Test Approval Business",
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

        console.log(`\n✅ Test user created!`)
        console.log(`📧 Email: ${email}`)
        console.log(`🔗 Magic Link: http://localhost:3000/auth/magic-link/${token}`)
        console.log(`\nCopy this URL to test the onboarding flow.\n`)

    } catch (error) {
        console.error('ERROR:', error)
    } finally {
        await prisma.$disconnect()
    }
}

createTestUser()
