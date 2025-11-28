
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'employee@downtown.com'

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        console.error('User not found:', email)
        return
    }

    // Find and delete any open shifts for this user
    const result = await prisma.cashDrawerSession.deleteMany({
        where: {
            employeeId: user.id,
            status: 'OPEN'
        }
    })

    console.log(`Deleted ${result.count} open shift(s) for ${user.name}.`)
    console.log('You should now see the Open Shift modal on the POS page.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
