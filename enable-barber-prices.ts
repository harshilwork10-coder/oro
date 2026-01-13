import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Enable canSetOwnPrices for all EMPLOYEE role users
    const result = await prisma.user.updateMany({
        where: {
            role: 'EMPLOYEE'
        },
        data: {
            canSetOwnPrices: true
        }
    })

    console.log(`Updated ${result.count} employees to have canSetOwnPrices = true`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
