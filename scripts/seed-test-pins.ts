import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding test PINs for all users...')

    // Hash the default PIN "1234"
    const defaultPinHash = await hash('1234', 10)

    // Update all users without a PIN
    const result = await prisma.user.updateMany({
        where: {
            pin: null
        },
        data: {
            pin: defaultPinHash
        }
    })

    console.log(`✅ Set default PIN "1234" for ${result.count} users`)
}

main()
    .catch((e) => {
        console.error('❌ Error seeding PINs:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
