import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Cleaning database and creating fresh PROVIDER user...')

    // Delete all data in reverse dependency order
    await prisma.transactionLineItem.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.checkIn.deleteMany()
    await prisma.appointment.deleteMany()
    await prisma.service.deleteMany()
    await prisma.serviceCategory.deleteMany()
    await prisma.terminal.deleteMany()
    await prisma.location.deleteMany()
    await prisma.client.deleteMany()
    await prisma.franchise.deleteMany()
    await prisma.franchisor.deleteMany()
    await prisma.user.deleteMany()

    console.log('✓ All data cleared')

    // Create single PROVIDER user
    const hashedPassword = await hash('OronexAdmin123!', 10)

    const provider = await prisma.user.create({
        data: {
            name: 'Oronex Admin',
            email: 'admin@oronex.com',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })

    console.log('✅ Fresh PROVIDER user created!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email:    admin@oronex.com')
    console.log('🔑 Password: OronexAdmin123!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
