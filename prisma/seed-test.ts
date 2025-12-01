import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting test data seed...')

    const hashedPassword = await hash('password123', 10)

    // 1. Ensure Provider exists
    const providerEmail = 'provider@aura.com'
    let provider = await prisma.user.findUnique({ where: { email: providerEmail } })

    if (!provider) {
        console.log('👤 Creating Provider...')
        provider = await prisma.user.create({
            data: {
                name: 'Platform Admin',
                email: providerEmail,
                password: hashedPassword,
                role: 'PROVIDER',
                providerRole: 'SUPER_ADMIN'
            }
        })
    } else {
        console.log('👤 Provider already exists.')
    }

    // 2. Create Franchisor Owner
    const franchisorEmail = 'franchisor@test.com'
    let franchisorUser = await prisma.user.findUnique({ where: { email: franchisorEmail } })

    if (!franchisorUser) {
        console.log('👤 Creating Franchisor Owner...')
        franchisorUser = await prisma.user.create({
            data: {
                name: 'Test Owner',
                email: franchisorEmail,
                password: hashedPassword,
                role: 'FRANCHISOR'
            }
        })
    } else {
        console.log('👤 Franchisor Owner already exists.')
    }

    // 3. Create Franchisor Company
    let franchisor = await prisma.franchisor.findFirst({ where: { ownerId: franchisorUser.id } })

    if (!franchisor) {
        console.log('🏢 Creating Franchisor Company...')
        franchisor = await prisma.franchisor.create({
            data: {
                name: 'Tesla Style Franchise',
                ownerId: franchisorUser.id,
                supportFee: 99.00
            }
        })
    } else {
        console.log('🏢 Franchisor Company already exists.')
    }

    // 4. Create Location
    const locationName = 'Downtown Test Store'
    let location = await prisma.location.findFirst({
        where: {
            franchisorId: franchisor.id,
            name: locationName
        }
    })

    if (!location) {
        console.log('📍 Creating Location...')
        location = await prisma.location.create({
            data: {
                name: locationName,
                franchisorId: franchisor.id,
                address: '123 Test St',
                city: 'Tech City',
                state: 'CA',
                zip: '90210',
                email: 'store@test.com',
                phone: '555-0123'
            }
        })
    } else {
        console.log('📍 Location already exists.')
    }

    console.log('\n✅ Test Data Ready!')
    console.log('---------------------------------------------------')
    console.log('🔐 Admin Login:      provider@aura.com  / password123')
    console.log('🔐 Franchisor Login: franchisor@test.com / password123')
    console.log('---------------------------------------------------')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
