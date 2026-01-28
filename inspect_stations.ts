
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Inspecting Stations ---')
    try {
        // Try to raw query to bypass Prisma validation if possible, or just catch the error
        // Using $queryRaw is better to see what's actually in the DB without Prisma interpretation
        const stations = await prisma.$queryRaw`SELECT id, name, "paymentMode" FROM "Station"`
        console.log(stations)
    } catch (e) {
        console.error('Raw query failed:', e)
        try {
            // Fallback to findMany if queryRaw fails (unlikely for Postgres)
            const stations = await prisma.station.findMany()
            console.log(stations)
        } catch (e2) {
            console.error('findMany failed:', e2)
        }
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
