import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔧 Creating ALL test users with fresh credentials...\n')

    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Delete ALL existing test users
    await prisma.user.deleteMany({
        where: {
            email: {
                in: ['provider@test.com', 'crm@test.com', 'owner@test.com', 'employee@test.com']
            }
        }
    })

    console.log('✅ Cleared old users\n')

    // 1. CREATE PROVIDER
    const provider = await prisma.user.create({
        data: {
            email: 'provider@test.com',
            password: hashedPassword,
            name: 'System Provider',
            role: 'PROVIDER',
        }
    })
    console.log('✅ Created PROVIDER: provider@test.com / password123')

    // 2. CREATE BRAND FRANCHISOR (CRM)
    const crmUser = await prisma.user.create({
        data: {
            email: 'crm@test.com',
            password: hashedPassword,
            name: 'CRM Manager',
            role: 'FRANCHISOR',
        }
    })

    // Create franchisor entity for CRM user
    await prisma.franchisor.create({
        data: {
            name: 'CRM Test Company',
            businessType: 'BRAND_FRANCHISOR',
            ownerId: crmUser.id,
        }
    })
    console.log('✅ Created BRAND FRANCHISOR: crm@test.com / password123')

    // 3. CREATE MULTI-LOCATION OWNER
    const ownerUser = await prisma.user.create({
        data: {
            email: 'owner@test.com',
            password: hashedPassword,
            name: 'Location Owner',
            role: 'FRANCHISOR',
        }
    })

    // Create franchisor entity for owner
    await prisma.franchisor.create({
        data: {
            name: 'Multi-Location Business',
            businessType: 'MULTI_LOCATION_OWNER',
            ownerId: ownerUser.id,
        }
    })
    console.log('✅ Created MULTI-LOCATION OWNER: owner@test.com / password123')

    // 4. CREATE EMPLOYEE
    const employeeUser = await prisma.user.create({
        data: {
            email: 'employee@test.com',
            password: hashedPassword,
            name: 'Test Employee',
            role: 'EMPLOYEE',
        }
    })
    console.log('✅ Created EMPLOYEE: employee@test.com / password123')

    // Verify all passwords
    console.log('\n🔍 Verifying all passwords...')
    const allUsers = await prisma.user.findMany({
        where: {
            email: {
                in: ['provider@test.com', 'crm@test.com', 'owner@test.com', 'employee@test.com']
            }
        }
    })

    for (const user of allUsers) {
        const isValid = await bcrypt.compare('password123', user.password!)
        console.log(`   ${user.email}: ${isValid ? '✅ PASS' : '❌ FAIL'}`)
    }

    console.log('\n✅ ALL USERS CREATED SUCCESSFULLY!')
    console.log('\nLogin at: http://localhost:3000/login')
    console.log('Password for ALL accounts: password123')
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
