
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

    const location = await prisma.location.findFirst()

    if (!location) {
        console.error('No location found')
        return
    }

    console.log(`Found user: ${user.name} (${user.id})`)
    console.log(`Found location: ${location.name} (${location.id})`)

    // Ensure user is assigned to location
    await prisma.user.update({
        where: { id: user.id },
        data: { locationId: location.id }
    })

    // Check if there's already an open shift
    const existingShift = await prisma.cashDrawerSession.findFirst({
        where: {
            employeeId: user.id,
            endTime: null
        }
    })

    if (existingShift) {
        console.log('Open shift already exists:', existingShift.id)
        return
    }

    // Create a new open shift
    const shift = await prisma.cashDrawerSession.create({
        data: {
            employeeId: user.id,
            locationId: location.id,
            startTime: new Date(),
            startingCash: 100.00,
            status: 'OPEN'
        }
    })

    console.log('Created open shift:', shift.id)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
