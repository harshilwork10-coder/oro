import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs' // IMPORTANT: Using bcryptjs to match auth.ts

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Resetting passwords with bcryptjs (matching auth.ts)...\n')

    // Hash with bcryptjs (same as auth.ts uses for comparison)
    const hashedPassword = await hash('password123', 10)

    console.log('Hashed password created with bcryptjs')
    console.log(`Password will be: password123\n`)

    // Update ALL users
    const result = await prisma.user.updateMany({
        data: {
            password: hashedPassword
        }
    })

    console.log(`✅ Updated ${result.count} users\n`)

    // Show all users
    const allUsers = await prisma.user.findMany({
        select: { email: true, role: true, name: true }
    })

    console.log('='.repeat(70))
    console.log('✅ ALL PASSWORDS RESET TO: password123')
    console.log('='.repeat(70))
    console.log('\n📋 WORKING CREDENTIALS:\n')

    allUsers.forEach(user => {
        console.log(`${user.role.padEnd(15)} | ${user.email}`)
        console.log(`${''.padEnd(15)} | Password: password123`)
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
