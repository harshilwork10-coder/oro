import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function cleanupForManualTesting() {
    console.log('🧹 Cleaning database for manual testing...')
    console.log('⚠️  This will remove ALL data except the PROVIDER account!')

    try {
        console.log('  Deleting all dependent records...')

        // Use any to bypass TypeScript checking for dynamic model access
        const db = prisma as any

        // List of models to clear in dependency order
        const modelsToClear = [
            'itemLineItem',
            'transactionLineItem',
            'transaction',
            'checkIn',
            'appointment',
            'cashDrawerSession',
            'tagAlongItem',
            'product',
            'productCategory',
            'department',
            'service',
            'serviceCategory',
            'item',
            'unifiedCategory',
            'client',
            'customerPromo',
            'smsMarketingRule',
            'promotion',
            'loyaltyTransaction',
            'loyaltyAccount',
            'loyaltyProgram',
            'review',
            'station',
            'paymentTerminal',
            'location',
            'franchiseSettings',
            'franchise',
            'businessConfig',
            'franchisor'
        ]

        // First clear user references
        console.log('  Clearing user references...')
        await prisma.user.updateMany({
            data: { assignedStationId: null, franchiseId: null, locationId: null }
        })

        // Delete each model
        for (const model of modelsToClear) {
            try {
                if (db[model]) {
                    await db[model].deleteMany()
                    console.log(`    ✓ ${model}`)
                }
            } catch (e: any) {
                // Silently skip - table may not exist or have FK issues
            }
        }

        // Delete all users except PROVIDER
        console.log('  Deleting all users except PROVIDER...')
        await prisma.user.deleteMany({
            where: {
                role: { not: 'PROVIDER' }
            }
        })

        // Verify provider still exists, create if not
        const hashedPassword = await hash('password123', 10)
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

        console.log('')
        console.log('✅ Database cleaned successfully!')
        console.log('')
        console.log('📋 Only remaining account:')
        console.log('   Email:    provider@test.com')
        console.log('   Password: password123')
        console.log('   Role:     PROVIDER')
        console.log('')
        console.log('🚀 You can now test the full onboarding flow:')
        console.log('   1. Login as provider')
        console.log('   2. Create a new franchisor (client)')
        console.log('   3. Set up their franchise, locations, services')
        console.log('   4. Create employees and test POS')

    } catch (error) {
        console.error('❌ Error during cleanup:', error)
        throw error
    }
}

cleanupForManualTesting()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
