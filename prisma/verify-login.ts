import { PrismaClient } from '@prisma/client'
import { compare, hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Verifying Login Credentials for crm@test.com...\n')

    const email = 'crm@test.com'
    const password = 'password123'

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        console.log('❌ User NOT found!')
        return
    }

    console.log('✓ User found:', user.email)
    console.log('  Role:', user.role)
    console.log('  Stored Hash:', user.password)

    console.log('\nTesting password comparison...')
    const isValid = await compare(password, user.password!)
    console.log(`  compare('${password}', hash) === ${isValid}`)

    if (isValid) {
        console.log('\n✅ Password is CORRECT in database!')
    } else {
        console.log('\n❌ Password MISMATCH in database!')

        console.log('\nGenerating new hash for comparison...')
        const newHash = await hash(password, 10)
        console.log('  New Hash:', newHash)
        const newValid = await compare(password, newHash)
        console.log(`  compare('${password}', newHash) === ${newValid}`)
    }

    // Check Franchisor link
    if (user.role === 'FRANCHISOR') {
        console.log('\nChecking Franchisor Link...')
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id }
        })

        if (franchisor) {
            console.log('✅ Franchisor entity found:', franchisor.name)
            console.log('  Business Type:', franchisor.businessType)
        } else {
            console.log('❌ Franchisor entity NOT found for ownerId:', user.id)
        }
    }
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
