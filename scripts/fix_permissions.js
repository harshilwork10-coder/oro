const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find all employees
    const employees = await prisma.user.findMany({
        where: { role: 'EMPLOYEE' },
        select: { id: true, name: true, email: true, canAddServices: true, canAddProducts: true }
    });

    console.log('Current Employee Permissions:');
    console.log(JSON.stringify(employees, null, 2));

    // Update ALL employees to have canAddServices and canAddProducts = true
    const result = await prisma.user.updateMany({
        where: { role: 'EMPLOYEE' },
        data: {
            canAddServices: true,
            canAddProducts: true
        }
    });

    console.log('\nUpdated', result.count, 'employees with canAddServices=true, canAddProducts=true');
}

main().finally(() => prisma.$disconnect());
