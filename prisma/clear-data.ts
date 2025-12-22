/**
 * Clear all data from the database except the admin@oronex.com user
 * Run with: npx ts-node prisma/clear-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearAllData() {
    console.log('🧹 Starting database cleanup...')
    console.log('📧 Preserving user: admin@oronex.com\n')

    try {
        // Get the admin user to preserve
        const adminUser = await prisma.user.findUnique({
            where: { email: 'admin@oronex.com' }
        })

        if (!adminUser) {
            console.log('⚠️  admin@oronex.com not found! Aborting.')
            return
        }

        console.log(`✅ Found admin user: ${adminUser.name || adminUser.email}`)

        // Delete in order to avoid foreign key constraints
        // Start with the most dependent tables first

        console.log('\n🗑️  Deleting data...')

        // Transactions and related
        const txItems = await prisma.transactionItem.deleteMany({})
        console.log(`   - TransactionItem: ${txItems.count}`)

        const txPayments = await prisma.transactionPayment.deleteMany({})
        console.log(`   - TransactionPayment: ${txPayments.count}`)

        const transactions = await prisma.transaction.deleteMany({})
        console.log(`   - Transaction: ${transactions.count}`)

        // Appointments and bookings
        const appts = await prisma.appointment.deleteMany({})
        console.log(`   - Appointment: ${appts.count}`)

        // Customers
        const customers = await prisma.customer.deleteMany({})
        console.log(`   - Customer: ${customers.count}`)

        // Inventory related
        const products = await prisma.product.deleteMany({})
        console.log(`   - Product: ${products.count}`)

        const items = await prisma.item.deleteMany({})
        console.log(`   - Item: ${items.count}`)

        const categories = await prisma.productCategory.deleteMany({})
        console.log(`   - ProductCategory: ${categories.count}`)

        const departments = await prisma.department.deleteMany({})
        console.log(`   - Department: ${departments.count}`)

        // Services
        const services = await prisma.service.deleteMany({})
        console.log(`   - Service: ${services.count}`)

        const serviceCategories = await prisma.serviceCategory.deleteMany({})
        console.log(`   - ServiceCategory: ${serviceCategories.count}`)

        // Shifts
        const shifts = await prisma.shift.deleteMany({})
        console.log(`   - Shift: ${shifts.count}`)

        // Stations and Terminals
        const stations = await prisma.station.deleteMany({})
        console.log(`   - Station: ${stations.count}`)

        const terminals = await prisma.terminal.deleteMany({})
        console.log(`   - Terminal: ${terminals.count}`)

        // Locations
        const locations = await prisma.location.deleteMany({})
        console.log(`   - Location: ${locations.count}`)

        // Delete all users EXCEPT admin
        const users = await prisma.user.deleteMany({
            where: {
                email: { not: 'admin@oronex.com' }
            }
        })
        console.log(`   - User (other than admin): ${users.count}`)

        // Franchises
        const franchises = await prisma.franchise.deleteMany({})
        console.log(`   - Franchise: ${franchises.count}`)

        // Franchisors
        const franchisors = await prisma.franchisor.deleteMany({})
        console.log(`   - Franchisor: ${franchisors.count}`)

        // SMS logs
        const smsLogs = await prisma.smsLog.deleteMany({})
        console.log(`   - SmsLog: ${smsLogs.count}`)

        // Audit logs
        const auditLogs = await prisma.auditLog.deleteMany({})
        console.log(`   - AuditLog: ${auditLogs.count}`)

        // Clear admin's franchise/franchisor associations
        await prisma.user.update({
            where: { email: 'admin@oronex.com' },
            data: {
                franchiseId: null,
                franchisorId: null,
                locationId: null
            }
        })

        console.log('\n✨ Database cleared successfully!')
        console.log('📧 Preserved: admin@oronex.com')

    } catch (error) {
        console.error('❌ Error clearing data:', error)
    } finally {
        await prisma.$disconnect()
    }
}

clearAllData()
