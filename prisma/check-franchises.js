const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    const franchises = await p.franchise.findMany({
        select: {
            id: true,
            name: true,
            franchisorId: true,
            _count: { select: { services: true } }
        }
    })

    console.log('All Franchises:')
    franchises.forEach(f => {
        console.log(`  - ${f.name || f.id}`)
        console.log(`    franchisorId: ${f.franchisorId}`)
        console.log(`    services: ${f._count.services}`)
        console.log('')
    })
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect())
