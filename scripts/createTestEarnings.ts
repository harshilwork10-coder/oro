import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestEarnings() {
    console.log('🔧 Creating test data for earnings preview...')

    try {
        // Find the test employee
        const employee = await prisma.user.findUnique({
            where: { email: 'employee@test.com' }
        })

        if (!employee) {
            console.log('❌ Employee not found. Run: npx prisma db seed first')
            return
        }

        console.log(`✅ Found employee: ${employee.name}`)

        // Create payment config if not exists
        const paymentConfig = await prisma.employeePaymentConfig.upsert({
            where: { employeeId: employee.id },
            create: {
                employeeId: employee.id,
                paymentType: 'COMMISSION',
                defaultCommissionRate: 0.40, // 40%
                usesTieredCommission: true,
                productCommissionRate: 0.10
            },
            update: {}
        })

        console.log('✅ Payment config created')

        // Create commission tiers
        await prisma.commissionTier.deleteMany({ where: { employeeId: employee.id } })

        const tiers = [
            { name: 'Bronze', minRevenue: 0, maxRevenue: 2000, percentage: 0.35, priority: 0 },
            { name: 'Silver', minRevenue: 2001, maxRevenue: 5000, percentage: 0.40, priority: 1 },
            { name: 'Gold', minRevenue: 5001, maxRevenue: null, percentage: 0.45, priority: 2 }
        ]

        for (const tier of tiers) {
            await prisma.commissionTier.create({
                data: {
                    employeeId: employee.id,
                    tierName: tier.name,
                    minRevenue: tier.minRevenue,
                    maxRevenue: tier.maxRevenue,
                    percentage: tier.percentage,
                    priority: tier.priority
                }
            })
        }

        console.log('✅ Commission tiers created (Bronze, Silver, Gold)')

        // Create test transactions for TODAY
        const today = new Date()

        // Transaction 1: $50 service
        const txn1 = await prisma.transaction.create({
            data: {
                locationId: employee.locationId!,
                subtotal: 50,
                tax: 4,
                total: 54,
                paymentMethod: 'CARD',
                tipAmount: 10,
                createdAt: new Date(today.getTime() - 3 * 60 * 60 * 1000) // 3 hours ago
            }
        })

        await prisma.transactionLineItem.create({
            data: {
                transactionId: txn1.id,
                type: 'SERVICE',
                itemId: 'haircut',
                name: 'Haircut',
                price: 50,
                finalPrice: 50,
                quantity: 1,
                providerId: employee.id
            }
        })

        // Transaction 2: $80 service
        const txn2 = await prisma.transaction.create({
            data: {
                locationId: employee.locationId!,
                subtotal: 80,
                tax: 6.4,
                total: 86.4,
                paymentMethod: 'CARD',
                tipAmount: 15,
                createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
            }
        })

        await prisma.transactionLineItem.create({
            data: {
                transactionId: txn2.id,
                type: 'SERVICE',
                itemId: 'color',
                name: 'Hair Color',
                price: 80,
                finalPrice: 80,
                quantity: 1,
                providerId: employee.id
            }
        })

        // Transaction 3: $45 service + $20 product
        const txn3 = await prisma.transaction.create({
            data: {
                locationId: employee.locationId!,
                subtotal: 65,
                tax: 5.2,
                total: 70.2,
                paymentMethod: 'CASH',
                tipAmount: 8,
                createdAt: new Date(today.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
            }
        })

        await prisma.transactionLineItem.createMany({
            data: [
                {
                    transactionId: txn3.id,
                    type: 'SERVICE',
                    itemId: 'blowout',
                    name: 'Blowout',
                    price: 45,
                    finalPrice: 45,
                    quantity: 1,
                    providerId: employee.id
                },
                {
                    transactionId: txn3.id,
                    type: 'PRODUCT',
                    itemId: 'shampoo',
                    name: 'Shampoo',
                    price: 20,
                    finalPrice: 20,
                    quantity: 1,
                    providerId: employee.id
                }
            ]
        })

        console.log('✅ Created 3 test transactions:')
        console.log('   - Haircut: $50 + $10 tip')
        console.log('   - Hair Color: $80 + $15 tip')
        console.log('   - Blowout + Product: $65 + $8 tip')
        console.log('')
        console.log('📊 Expected Earnings:')
        console.log('   Service Revenue: $175 (50+80+45)')
        console.log('   Product Revenue: $20')
        console.log('   Total Revenue: $195')
        console.log('   Commission (35% Bronze): $68.25')
        console.log('   Tips: $33')
        console.log('   Total: $101.25')
        console.log('')
        console.log('✅ Test data ready! Refresh the earnings page.')

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

createTestEarnings()
