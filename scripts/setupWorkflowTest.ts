// Quick script to set up test client for workflow testing
// Run with: npx tsx scripts/setupWorkflowTest.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔧 Setting up workflow test data...\n')

    // 1. Find the test franchisor
    const franchisor = await prisma.franchisor.findFirst({
        where: {
            owner: { email: 'multistore@test.com' }
        },
        include: { owner: true }
    })

    if (!franchisor) {
        console.log('❌ Test franchisor not found')
        console.log('Please create it via the UI first:')
        console.log('1. Login as provider@test.com')
        console.log('2. Add client: multistore@test.com')
        console.log('3. Approve the client')
        return
    }

    console.log(`✅ Found franchisor: ${franchisor.name}`)

    // 2. Set password for the owner
    const hashedPassword = await bcrypt.hash('password123', 10)
    await prisma.user.update({
        where: { id: franchisor.ownerId },
        data: { password: hashedPassword }
    })
    console.log('✅ Password set: password123')

    // 3. Create/Update BusinessConfig
    const config = await prisma.businessConfig.upsert({
        where: { franchisorId: franchisor.id },
        create: {
            franchisorId: franchisor.id,
            usesCommissions: true,
            usesInventory: true,
            usesAppointments: true,
            usesScheduling: true,
            usesLoyalty: true,
            usesGiftCards: true,
            usesMemberships: false,
            usesReferrals: false,
            usesTipping: true,
            usesDiscounts: true,
            usesRetailProducts: true,
            usesServices: true,
            usesEmailMarketing: true,
            usesSMSMarketing: true,
            usesReviewManagement: true,
            usesMultiLocation: false,
            usesTimeTracking: true,
            usesPayroll: true,
            cashDiscountEnabled: true,
            cashDiscountPercent: 3.5
        },
        update: {
            cashDiscountEnabled: true,
            cashDiscountPercent: 3.5
        }
    })
    console.log('✅ BusinessConfig created')
    console.log(`   Cash Discount: ${config.cashDiscountEnabled ? config.cashDiscountPercent + '%' : 'OFF'}`)

    // 4. Create a test franchise (location)
    const franchise = await prisma.franchise.findFirst({
        where: { franchisorId: franchisor.id }
    })

    if (!franchise) {
        const newFranchise = await prisma.franchise.create({
            data: {
                name: 'Downtown Salon',
                franchisorId: franchisor.id,
                approvalStatus: 'APPROVED'
            }
        })
        console.log(`✅ Created location: ${newFranchise.name}`)
    } else {
        console.log(`✅ Location exists: ${franchise.name}`)
    }

    console.log('\n🎉 Setup complete!')
    console.log('\n📋 Next steps:')
    console.log('1. Login as: multistore@test.com / password123')
    console.log('2. Add an employee')
    console.log('3. Configure commission for the employee')
    console.log('4. Test the workflow!\n')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
