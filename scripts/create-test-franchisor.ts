import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function createTestFranchisor() {
    try {
        const email = `test.franchisor.${Date.now()}@example.com`
        const name = "Test Franchise Owner"

        console.log(`Creating test franchisor: ${email}`)

        // 1. Create User
        const user = await prisma.user.create({
            data: {
                email,
                name,
                role: 'FRANCHISOR',
                image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            }
        })

        // 2. Create Franchisor Profile
        // Using 'any' to bypass potential type mismatches if client isn't fully regenerated
        const franchisorData: any = {
            name: "Test Franchise Brand",
            businessType: "BRAND_FRANCHISOR",
            ownerId: user.id,
        }

        const franchisor = await prisma.franchisor.create({
            data: franchisorData
        })

        // 3. Create Magic Link
        const token = randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        await prisma.magicLink.create({
            data: {
                token,
                email,
                userId: user.id,
                expiresAt,
            }
        })

        console.log('\n✅ Test Franchisor Created!')
        console.log(`Email: ${email}`)
        console.log(`Magic Link: http://localhost:3000/auth/magic-link/${token}`)

    } catch (error) {
        console.error('Error creating test franchisor:', error)
    } finally {
        await prisma.$disconnect()
    }
}

createTestFranchisor()
