
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Debugging Employee Data Scope ---')

    const employees = await prisma.user.findMany({
        where: { role: 'EMPLOYEE' },
        include: { franchise: true }
    })

    console.log(`Found ${employees.length} EMPLOYEES:`)

    for (const emp of employees) {
        console.log(`\nUser: ${emp.name} (${emp.email || 'No Email'})`)
        console.log(`ID: ${emp.id}`)
        console.log(`Franchise: ${emp.franchiseId ? emp.franchiseId : '❌ ORPHANED (NULL)'}`)

        if (emp.franchiseId) {
            const serviceCount = await prisma.service.count({
                where: { franchiseId: emp.franchiseId }
            })
            const categoryCount = await prisma.serviceCategory.count({
                where: { franchiseId: emp.franchiseId }
            })
            console.log(`   -> Sees ${serviceCount} Services`)
            console.log(`   -> Sees ${categoryCount} Categories`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
