import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function setupTestClient() {
    console.log('🔧 Setting up test multi-store owner...')

    try {
        // Find the franchisor we just created
        const franchisor = await prisma.franchisor.findFirst({
            where: {
                owner: {
                    email: 'multistore@test.com'
                }
            },
            include: {
                owner: true
            }
        })

        if (!franchisor) {
            console.log('❌ Franchisor not found. Make sure you created it via the UI first.')
            return
        }

        console.log(`✅ Found franchisor: ${franchisor.name}`)

        // Set password for the owner
        const hashedPassword = await bcrypt.hash('password123', 10)
        await prisma.user.update({
            where: { id: franchisor.ownerId },
            data: { password: hashedPassword }
        })

        console.log('✅ Password set for multistore@test.com (password: password123)')

        // Create BusinessConfig for this franchisor
        const config = await prisma.businessConfig.upsert({
            where: { franchisorId: franchisor.id },
            create: {
                franchisorId: franchisor.id,
                // Enable all features for testing
                usesCommissions: true,
                usesInventory: true,
                usesAppointments: true,
                usesScheduling: true,
                usesLoyalty: true,
                usesGiftCards: true,
                usesMemberships: true,
                usesReferrals: true,
                usesTipping: true,
                usesDiscounts: true,
                usesRetailProducts: true,
                usesServices: true,
                usesEmailMarketing: true,
                usesSMSMarketing: true,
                usesReviewManagement: true,
                usesMultiLocation: true,
                usesTimeTracking: true,
                usesPayroll: true,

                // Cash discount settings
                cashDiscountEnabled: true,
                cashDiscountPercent: 3.5,

                // Workflow settings
                reviewRequestTiming: '1_HOUR_AFTER',
                reviewRequestMethod: 'SMS',
                tipPromptEnabled: true,
                commissionCalculation: 'AUTOMATIC',
                commissionVisibility: 'ALWAYS'
            },
            update: {}
        })

        console.log('✅ BusinessConfig created with all features enabled')

        // Create a test location/franchise for them
        const franchise = await prisma.franchise.create({
            data: {
                name: 'Test Salon Downtown',
                franchisorId: franchisor.id,
                approvalStatus: 'APPROVED'
            }
        })

        console.log(`✅ Created test location: ${franchise.name}`)

        console.log('')
        console.log('🎉 Setup complete!')
        console.log('')
        console.log('Now you can:')
        console.log('1. Login as: multistore@test.com / password123')
        console.log('2. Add employees to "Test Salon Downtown"')
        console.log('3. Configure commission settings')

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

setupTestClient()
