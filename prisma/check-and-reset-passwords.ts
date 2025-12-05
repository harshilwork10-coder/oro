import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Checking existing users...\n')

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true
        }
    })

    if (users.length === 0) {
        console.log('❌ NO USERS FOUND IN DATABASE!')
        console.log('Creating fresh users now...\n')

        const hashedPassword = await hash('password123', 10)

        // Create provider
        await prisma.user.create({
            data: {
                name: 'Platform Admin',
                email: 'admin@aura.com',
                password: hashedPassword,
                role: 'PROVIDER'
            }
        })

        // Create franchisor for CRM testing
        const franchisorUser = await prisma.user.create({
            data: {
                name: 'CRM Test User',
                email: 'crm@test.com',
                password: hashedPassword,
                role: 'FRANCHISOR'
            }
        })

        // Create franchisor entity
        await prisma.franchisor.create({
            data: {
                userId: franchisorUser.id,
                name: 'CRM Test Company',
                businessType: 'BRAND_FRANCHISOR'
            }
        })

        console.log('✅ Created fresh users!')
    } else {
        console.log(`Found ${users.length} users:\n`)
        users.forEach(user => {
            console.log(`${user.role.padEnd(15)} | ${user.email.padEnd(30)} | ${user.name}`)
        })
    }

    console.log('\n' + '='.repeat(70))
    console.log('🔄 RESETTING ALL PASSWORDS TO: password123')
    console.log('='.repeat(70))

    const hashedPassword = await hash('password123', 10)

    await prisma.user.updateMany({
        data: {
            password: hashedPassword
        }
    })

    console.log('\n✅ ALL PASSWORDS RESET!')
    console.log('\n📋 WORKING CREDENTIALS:\n')

    const allUsers = await prisma.user.findMany({
        select: { email: true, role: true, name: true }
    })

    allUsers.forEach(user => {
        console.log(`${user.role}:`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Password: password123`)
        console.log(`  Name: ${user.name}`)
        console.log('')
    })

    console.log('='.repeat(70))
    console.log('🌐 Login at: http://localhost:3000/login')
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
