import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting minimal database seed...')

    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    try {
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;')
        await prisma.transaction.deleteMany()
        await prisma.appointment.deleteMany()
        await prisma.client.deleteMany()
        await prisma.service.deleteMany()
        await prisma.user.deleteMany()
        await prisma.location.deleteMany()
        await prisma.franchise.deleteMany()
        await prisma.franchisor.deleteMany()
        await prisma.globalService.deleteMany()
        await prisma.globalProduct.deleteMany()
        await prisma.product.deleteMany()
        await prisma.membershipPlan.deleteMany()
        await prisma.clientMembership.deleteMany()
        await prisma.supplier.deleteMany()
        await prisma.purchaseOrder.deleteMany()
        await prisma.timeEntry.deleteMany()
        await prisma.cashDrawerSession.deleteMany()
        await prisma.commissionRule.deleteMany()
        await prisma.loyaltyProgram.deleteMany()
        await prisma.giftCard.deleteMany()
        await prisma.discount.deleteMany()
        await prisma.magicLink.deleteMany()
        await prisma.post.deleteMany()
        await prisma.comment.deleteMany()
        await prisma.vote.deleteMany()
        await prisma.userBadge.deleteMany()
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;')
    } catch (error) {
        console.error('Error clearing data:', error)
    }

    const hashedPassword = await hash('password123', 10)

    // Create Provider (Platform Admin) - ONLY ADMIN ACCOUNT
    console.log('👤 Creating Provider (Platform Admin)...')
    const provider = await prisma.user.upsert({
        where: { email: 'provider@aura.com' },
        update: {},
        create: {
            name: 'Platform Admin',
            email: 'provider@aura.com',
            password: hashedPassword,
            pin: await hash('1111', 10),
            role: 'PROVIDER',
            providerRole: 'SUPER_ADMIN',
            providerPermissions: JSON.stringify({
                canManageTeam: true,
                canManageFranchisors: true,
                canViewReports: true,
                canManageBilling: true
            })
        }
    })

    // Create Test Franchisor Owner
    console.log('👤 Creating Test Franchisor...')
    const franchisorUser = await prisma.user.upsert({
        where: { email: 'franchisor@test.com' },
        update: {},
        create: {
            name: 'Test Owner',
            email: 'franchisor@test.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    // Create Test Franchisor Company
    const franchisor = await prisma.franchisor.create({
        data: {
            name: 'Tesla Style Franchise',
            ownerId: franchisorUser.id,
            supportFee: 99.00
        }
    })

    // Create Test Location
    await prisma.location.create({
        data: {
            name: 'Downtown Test Store',
            franchisorId: franchisor.id,
            address: '123 Test St',
            city: 'Tech City',
            state: 'CA',
            zip: '90210',
            email: 'store@test.com',
            phone: '555-0123'
        }
    })

    console.log('✅ Seed completed successfully!')
    console.log('\n🎯 Login Credentials:')
    console.log('   Admin:      provider@aura.com  / password123')
    console.log('   Franchisor: franchisor@test.com / password123')
    console.log('\n✨ Ready to start fresh!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
