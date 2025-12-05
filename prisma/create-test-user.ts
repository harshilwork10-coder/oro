import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Creating minimal test user for CRM...')

    const hashedPassword = await hash('password123', 10)

    // Create or update test franchisor user
    console.log('👤 Creating Test Franchisor User...')
    const franchisorUser = await prisma.user.upsert({
        where: { email: 'franchisor@test.com' },
        update: {
            password: hashedPassword,
            role: 'FRANCHISOR'
        },
        create: {
            name: 'Test Franchisor',
            email: 'franchisor@test.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    console.log(`✅ User created: ${franchisorUser.email}`)

    // Check if franchisor entity exists
    let franchisor = await prisma.franchisor.findUnique({
        where: { userId: franchisorUser.id }
    })

    if (!franchisor) {
        console.log('👤 Creating Franchisor entity...')
        franchisor = await prisma.franchisor.create({
            data: {
                userId: franchisorUser.id,
                name: 'Test Franchise Brand',
                businessType: 'BRAND_FRANCHISOR'
            }
        })
        console.log(`✅ Franchisor entity created: ${franchisor.name}`)
    } else {
        console.log(`✅ Franchisor entity already exists: ${franchisor.name}`)
    }

    console.log('\n🎯 Login Credentials:')
    console.log('   Email: franchisor@test.com')
    console.log('   Password: password123')
    console.log('   URL: http://localhost:3000/login')
    console.log('\n✅ Setup complete!')
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
