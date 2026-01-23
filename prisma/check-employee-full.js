const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    // Check employee's franchise and its franchisor
    const employees = await p.user.findMany({
        where: { role: 'EMPLOYEE' },
        select: {
            id: true,
            name: true,
            email: true,
            franchiseId: true,
            franchise: {
                select: {
                    id: true,
                    name: true,
                    franchisorId: true,
                    franchisor: {
                        select: {
                            id: true,
                            name: true,
                            industryType: true
                        }
                    },
                    _count: { select: { services: true } }
                }
            }
        }
    })

    console.log('Employee → Franchise → Franchisor:')
    employees.forEach(e => {
        console.log(`  - ${e.name || e.email}`)
        console.log(`    franchiseId: ${e.franchiseId}`)
        console.log(`    franchise.name: ${e.franchise?.name}`)
        console.log(`    franchise.services: ${e.franchise?._count?.services}`)
        console.log(`    franchisor.name: ${e.franchise?.franchisor?.name}`)
        console.log(`    franchisor.industryType: ${e.franchise?.franchisor?.industryType}`)
        console.log('')
    })
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect())
