import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    const hashedPassword = await hash('password123', 10)

    // Create Provider (Platform Admin)
    console.log('👤 Creating Provider...')
    await prisma.user.upsert({
        where: { email: 'provider@test.com' },
        update: {},
        create: {
            name: 'System Provider',
            email: 'provider@test.com',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })

    console.log('✅ Seed completed!')
    console.log('\n🎯 Login: provider@test.com / password123')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
