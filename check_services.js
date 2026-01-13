const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        // Hardcoded franchise ID from previous logs
        const franchiseId = 'cmk9e643e000piqljygqezd13'
        console.log('Checking services for franchise:', franchiseId)

        const services = await prisma.service.findMany({
            where: { franchiseId },
            include: { serviceCategory: true }
        })
        console.log('--- Services ---')
        services.forEach(s => console.log(`[${s.id}] ${s.name} (Category: ${s.serviceCategory?.name})`))

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
