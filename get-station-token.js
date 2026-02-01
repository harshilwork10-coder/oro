const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function getStationToken() {
    // Get a trusted station for our test location
    const station = await prisma.posStation.findFirst({
        where: {
            locationId: 'cmkj1vkq4000812c60yoc4q1d',
            isTrusted: true
        },
        select: { id: true, name: true, stationToken: true }
    })

    if (station) {
        console.log('Station:', station.name)
        console.log('Token:', station.stationToken)
    } else {
        console.log('No trusted station found')

        // List all stations
        const allStations = await prisma.posStation.findMany({
            where: { locationId: 'cmkj1vkq4000812c60yoc4q1d' },
            select: { id: true, name: true, isTrusted: true }
        })
        console.log('All stations:', allStations)
    }

    await prisma.$disconnect()
}

getStationToken()
