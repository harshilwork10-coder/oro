import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Creating ALL users from scratch with correct schema...\n')

    const hashedPassword = await hash('password123', 10)

    // 1. Provider
    console.log('1. Creating PROVIDER...')
    await prisma.user.upsert({
        where: { email: 'admin@aura.com' },
        update: { password: hashedPassword },
        create: {
            name: 'Platform Admin',
            email: 'admin@aura.com',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })

    // 2. Brand Franchisor (CRM)
    console.log('2. Creating BRAND FRANCHISOR (CRM User)...')
    const brandUser = await prisma.user.upsert({
        where: { email: 'crm@test.com' },
        update: { password: hashedPassword },
        create: {
            name: 'CRM Test User',
            email: 'crm@test.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    await prisma.franchisor.upsert({
        where: { ownerId: brandUser.id },
        update: {},
        create: {
            ownerId: brandUser.id,
            name: 'CRM Test Company',
            businessType: 'BRAND_FRANCHISOR'
        }
    })

    // 3. Multi-Location Owner
    console.log('3. Creating MULTI-LOCATION OWNER (POS User)...')
    const multiUser = await prisma.user.upsert({
        where: { email: 'pos@test.com' },
        update: { password: hashedPassword },
        create: {
            name: 'POS Test User',
            email: 'pos@test.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    await prisma.franchisor.upsert({
        where: { ownerId: multiUser.id },
        update: {},
        create: {
            ownerId: multiUser.id,
            name: 'POS Test Company',
            businessType: 'MULTI_LOCATION_OWNER'
        }
    })

    console.log('\n' + '='.repeat(70))
    console.log('✅ ALL USERS CREATED SUCCESSFULLY!')
    console.log('='.repeat(70))
    console.log('\n📋 LOGIN CREDENTIALS (All use: password123)\n')
    console.log('1. ADMIN (Platform)')
    console.log('   Email: admin@aura.com')
    console.log('   Password: password123\n')
    console.log('2. CRM USER (Brand Franchisor) ⭐ USE THIS FOR CRM')
    console.log('   Email: crm@test.com')
    console.log('   Password: password123')
    console.log('   Access: CRM, Leads, Pipeline\n')
    console.log('3. POS USER (Multi-Location Owner) ⭐ USE THIS FOR POS')
    console.log('   Email: pos@test.com')
    console.log('   Password: password123')
    console.log('   Access: POS, Locations, Inventory\n')
    console.log('='.repeat(70))
    console.log('🌐 Login: http://localhost:3000/login')
    console.log('='.repeat(70))
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
