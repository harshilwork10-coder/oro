import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Creating ALL test users for different roles...\n')

    const hashedPassword = await hash('password123', 10)

    // 1. PROVIDER (Platform Admin)
    console.log('1️⃣ Creating PROVIDER (Platform Admin)...')
    const provider = await prisma.user.upsert({
        where: { email: 'provider@aura.com' },
        update: { password: hashedPassword },
        create: {
            name: 'Platform Admin',
            email: 'provider@aura.com',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })
    console.log(`   ✅ Provider: ${provider.email}\n`)

    // 2. BRAND FRANCHISOR
    console.log('2️⃣ Creating BRAND FRANCHISOR...')
    const brandFranchisor = await prisma.user.upsert({
        where: { email: 'brand@franchisor.com' },
        update: { password: hashedPassword },
        create: {
            name: 'Brand Franchisor Owner',
            email: 'brand@franchisor.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    let brandFranchisorEntity = await prisma.franchisor.findUnique({
        where: { ownerId: brandFranchisor.id }
    })

    if (!brandFranchisorEntity) {
        brandFranchisorEntity = await prisma.franchisor.create({
            data: {
                ownerId: brandFranchisor.id,
                name: 'Brand Franchise Corp',
                businessType: 'BRAND_FRANCHISOR'
            }
        })
    } else {
        // Update existing to ensure correct businessType
        brandFranchisorEntity = await prisma.franchisor.update({
            where: { id: brandFranchisorEntity.id },
            data: { businessType: 'BRAND_FRANCHISOR' }
        })
    }
    console.log(`   ✅ Brand Franchisor: ${brandFranchisor.email}`)
    console.log(`   📊 CRM Access: YES | POS Access: NO\n`)

    // 3. MULTI-LOCATION OWNER
    console.log('3️⃣ Creating MULTI-LOCATION OWNER...')
    const multiOwner = await prisma.user.upsert({
        where: { email: 'owner@multilocation.com' },
        update: { password: hashedPassword },
        create: {
            name: 'Multi-Location Owner',
            email: 'owner@multilocation.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    let multiOwnerEntity = await prisma.franchisor.findUnique({
        where: { ownerId: multiOwner.id }
    })

    if (!multiOwnerEntity) {
        multiOwnerEntity = await prisma.franchisor.create({
            data: {
                ownerId: multiOwner.id,
                name: 'Multi-Location Operations',
                businessType: 'MULTI_LOCATION_OWNER'
            }
        })
    } else {
        // Update existing to ensure correct businessType
        multiOwnerEntity = await prisma.franchisor.update({
            where: { id: multiOwnerEntity.id },
            data: { businessType: 'MULTI_LOCATION_OWNER' }
        })
    }
    console.log(`   ✅ Multi-Location Owner: ${multiOwner.email}`)
    console.log(`   📊 CRM Access: NO | POS Access: YES\n`)

    // 4. FRANCHISEE (with location)
    console.log('4️⃣ Creating FRANCHISEE...')

    // First ensure we have a franchise
    let franchise = await prisma.franchise.findFirst()
    if (!franchise) {
        franchise = await prisma.franchise.create({
            data: {
                name: 'Test Franchise',
                slug: 'test-franchise',
                franchisorId: brandFranchisorEntity.id
            }
        })
    }

    const franchisee = await prisma.user.upsert({
        where: { email: 'franchisee@location.com' },
        update: { password: hashedPassword },
        create: {
            name: 'Franchisee Owner',
            email: 'franchisee@location.com',
            password: hashedPassword,
            role: 'FRANCHISEE',
            franchiseId: franchise.id
        }
    })
    console.log(`   ✅ Franchisee: ${franchisee.email}`)
    console.log(`   📊 POS Access: YES | Location Management: YES\n`)

    // 5. EMPLOYEE
    console.log('5️⃣ Creating EMPLOYEE...')

    // Ensure we have a location
    let location = await prisma.location.findFirst()
    if (!location && franchise) {
        location = await prisma.location.create({
            data: {
                name: 'Downtown Store',
                slug: 'downtown-store',
                franchiseId: franchise.id,
                address: '123 Main St, Test City, CA 90001'
            }
        })
    }

    const employee = await prisma.user.upsert({
        where: { email: 'employee@store.com' },
        update: { password: hashedPassword },
        create: {
            name: 'Store Employee',
            email: 'employee@store.com',
            password: hashedPassword,
            role: 'EMPLOYEE',
            franchiseId: franchise?.id,
            locationId: location?.id
        }
    })
    console.log(`   ✅ Employee: ${employee.email}`)
    console.log(`   📊 POS Access: YES | Limited Permissions\n`)

    console.log('='.repeat(60))
    console.log('✅ ALL TEST USERS CREATED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log('\n📋 LOGIN CREDENTIALS (All passwords: password123)\n')
    console.log('1. PROVIDER (Platform Admin)')
    console.log('   Email: provider@aura.com')
    console.log('   Password: password123')
    console.log('   Access: Full platform admin access')
    console.log('')
    console.log('2. BRAND FRANCHISOR (CRM User)')
    console.log('   Email: brand@franchisor.com')
    console.log('   Password: password123')
    console.log('   Access: CRM, Leads, Pipeline, Territories')
    console.log('')
    console.log('3. MULTI-LOCATION OWNER (POS User)')
    console.log('   Email: owner@multilocation.com')
    console.log('   Password: password123')
    console.log('   Access: POS, Locations, Inventory, Reports')
    console.log('')
    console.log('4. FRANCHISEE')
    console.log('   Email: franchisee@location.com')
    console.log('   Password: password123')
    console.log('   Access: POS, Location management')
    console.log('')
    console.log('5. EMPLOYEE')
    console.log('   Email: employee@store.com')
    console.log('   Password: password123')
    console.log('   Access: POS operations only')
    console.log('\n' + '='.repeat(60))
    console.log('🌐 Login URL: http://localhost:3000/login')
    console.log('='.repeat(60))
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
