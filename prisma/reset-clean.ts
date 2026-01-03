import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🚨 RESETTING DATABASE - Keeping only admin@oronext.com...')

    // Delete all data in proper order (foreign key dependencies)
    try { await prisma.transactionLineItem.deleteMany() } catch { }
    try { await prisma.transaction.deleteMany() } catch { }
    try { await prisma.checkIn.deleteMany() } catch { }
    try { await prisma.appointment.deleteMany() } catch { }
    try { await prisma.tagAlongItem.deleteMany() } catch { }
    try { await prisma.product.deleteMany() } catch { }
    try { await prisma.productCategory.deleteMany() } catch { }
    try { await prisma.service.deleteMany() } catch { }
    try { await prisma.serviceCategory.deleteMany() } catch { }
    try { await prisma.timeEntry.deleteMany() } catch { } // Employee shifts/clock-in records
    try { await prisma.station.deleteMany() } catch { }
    try { await prisma.paymentTerminal.deleteMany() } catch { }
    try { await prisma.magicLink.deleteMany() } catch { }
    try { await prisma.client.deleteMany() } catch { }
    try { await prisma.location.deleteMany() } catch { }
    try { await prisma.franchise.deleteMany() } catch { }
    try { await prisma.franchisorConfig.deleteMany() } catch { }
    try { await prisma.franchisor.deleteMany() } catch { }
    try { await prisma.user.deleteMany() } catch { }

    console.log('🗑️ All data cleared!')

    // Create only admin user
    const hashedPassword = await hash('password123', 10)

    await prisma.user.create({
        data: {
            name: 'System Provider',
            email: 'admin@oronext.com',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })

    console.log('✅ Database reset complete!')
    console.log('📧 Login: admin@oronext.com')
    console.log('🔑 Password: password123')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
