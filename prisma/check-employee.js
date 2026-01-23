const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    // Get employees
    const employees = await p.user.findMany({
        where: { role: 'EMPLOYEE' },
        select: {
            id: true,
            name: true,
            email: true,
            franchiseId: true,
            locationId: true,
            pin: true
        }
    })

    console.log('Employees:')
    employees.forEach(e => {
        console.log(`  - ${e.name || e.email}`)
        console.log(`    franchiseId: ${e.franchiseId}`)
        console.log(`    locationId: ${e.locationId}`)
        console.log(`    hasPin: ${!!e.pin}`)
        console.log('')
    })

    // Check services at franchise
    if (employees.length > 0 && employees[0].franchiseId) {
        const services = await p.service.count({
            where: { franchiseId: employees[0].franchiseId }
        })
        console.log(`Services at franchise ${employees[0].franchiseId}: ${services}`)
    }
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect())
