
import { prisma } from './src/lib/prisma'

async function debugStation() {
    const code = "HUZUPR"
    console.log(`Searching for station with code: ${code}`)

    const station = await prisma.station.findFirst({
        where: {
            pairingCode: code
        }
    })

    if (!station) {
        console.log("❌ Station NOT FOUND in Database with that exact code.")

        // Try fuzzy search?
        const allStations = await prisma.station.findMany()
        console.log("Available Stations:", allStations.map(s => `${s.name}: ${s.pairingCode} (Active: ${s.isActive})`))
    } else {
        console.log("✅ Station FOUND:")
        console.log(JSON.stringify(station, null, 2))

        if (!station.isActive) {
            console.warn("⚠️ Station is INACTIVE! The API requires isActive: true.")
        }
    }
}

debugStation()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
