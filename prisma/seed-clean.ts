import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Clean Database - Provider Only...')

    const hashedPassword = await hash('password123', 10)

    // Only create Provider user - no demo data
    const provider = await prisma.user.upsert({
        where: { email: 'provider@test.com' },
        update: {},
        create: {
            name: 'System Provider',
            email: 'provider@test.com',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })

    console.log('✅ Provider user created!')
    console.log('   Login: provider@test.com / password123')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
