import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔧 Creating provider user...\n')

    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Delete existing provider user if exists
    await prisma.user.deleteMany({
        where: { email: 'provider@test.com' }
    })

    // Create provider user
    const provider = await prisma.user.create({
        data: {
            email: 'provider@test.com',
            password: hashedPassword,
            name: 'System Provider',
            role: 'PROVIDER',
        }
    })

    console.log('✅ Provider user created successfully!')
    console.log('\nLogin Credentials:')
    console.log('Email: provider@test.com')
    console.log('Password: password123')
    console.log(`Role: ${provider.role}`)
    console.log(`\nUser ID: ${provider.id}`)

    // Verify password works
    const isPasswordCorrect = await bcrypt.compare('password123', provider.password!)
    console.log(`\nPassword verification: ${isPasswordCorrect ? '✅ PASS' : '❌ FAIL'}`)
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
