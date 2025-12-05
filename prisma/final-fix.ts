import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔧 Fixing all users with ownerId field...\n')

    const hashedPassword = await hash('password123', 10)

    // Get all users
    const users = await prisma.user.findMany({
        where: { role: 'FRANCHISOR' }
    })

    console.log(`Found ${users.length} franchisor users\n`)

    for (const user of users) {
        // Check if franchisor exists
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id }
        })

        if (!franchisor) {
            console.log(`Creating franchisor for: ${user.email}`)
            await prisma.franchisor.create({
                data: {
                    ownerId: user.id,
                    name: user.name + ' Company',
                    businessType: user.email.includes('brand') || user.email.includes('franchisor') || user.email.includes('crm')
                        ? 'BRAND_FRANCHISOR'
                        : 'MULTI_LOCATION_OWNER'
                }
            })
        } else {
            console.log(`Franchisor exists for: ${user.email}`)
        }
    }

    // Reset all passwords
    await prisma.user.updateMany({
        data: { password: hashedPassword }
    })

    console.log('\n' + '='.repeat(70))
    console.log('✅ ALL FIXED! Credentials ready')
    console.log('='.repeat(70))

    const allUsers = await prisma.user.findMany({
        include: {
            franchisor: true
        }
    })

    console.log('\n📋 WORKING LOGINS (password: password123):\n')

    for (const user of allUsers) {
        console.log(`${user.role.padEnd(15)} | ${user.email}`)
        if (user.franchisor) {
            console.log(`${''.padEnd(15)} | BusinessType: ${user.franchisor.businessType}`)
        }
        console.log('')
    }

    console.log('='.repeat(70))
    console.log('🌐 Login: http://localhost:3000/login')
    console.log('='.repeat(70))
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
