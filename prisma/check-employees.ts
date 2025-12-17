import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkEmployees() {
    const employees = await prisma.user.findMany({
        where: {
            role: 'EMPLOYEE'
        },
        select: {
            id: true,
            email: true,
            name: true,
            pin: true,
            franchiseId: true,
            locationId: true
        }
    })

    console.log('Employees found:', employees.length)

    for (const emp of employees) {
        console.log(`\nEmployee: ${emp.name || emp.email}`)
        console.log(`  ID: ${emp.id}`)
        console.log(`  Email: ${emp.email}`)
        console.log(`  Has PIN: ${emp.pin ? 'Yes (hashed)' : 'No'}`)
        console.log(`  FranchiseId: ${emp.franchiseId || 'None'}`)
        console.log(`  LocationId: ${emp.locationId || 'None'}`)
    }

    await prisma.$disconnect()
}

checkEmployees().catch(e => {
    console.error(e)
    process.exit(1)
})
