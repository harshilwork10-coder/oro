const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const franchiseId = 'cmk9e643e000piqljygqezd13'

        // Find an employee
        const employee = await prisma.user.findFirst({
            where: {
                franchiseId,
                role: 'EMPLOYEE'
            }
        })

        if (!employee) {
            console.log('No employee found')
            return
        }

        console.log('Testing with Employee:', employee.name, employee.id)

        const barber = await prisma.user.findUnique({
            where: { id: employee.id },
            include: {
                franchise: {
                    include: {
                        services: true
                    }
                },
                priceOverrides: true,
                allowedServices: true
            }
        })

        if (!barber) {
            console.log('Barber not found in DB lookup')
            return
        }

        const allowedServiceIds = barber.allowedServices.map(a => a.serviceId)
        const hasAllowedServicesRestriction = allowedServiceIds.length > 0
        console.log('Allowed Services Count:', allowedServiceIds.length)

        const allServices = barber.franchise?.services || []
        console.log('Total Franchise Services:', allServices.length)

        const services = allServices
            .filter(service => !hasAllowedServicesRestriction || allowedServiceIds.includes(service.id))
            .map(service => {
                const override = barber.priceOverrides.find(o => o.serviceId === service.id)
                return {
                    id: service.id,
                    name: service.name,
                    price: override ? Number(override.price) : Number(service.price),
                    category: service.category || 'General' // Simulating API logic
                }
            })

        console.log('--- Final Services List ---')
        console.log('Count:', services.length)
        services.forEach(s => console.log(`- ${s.name} (${s.price}) [Cat: ${s.category}]`))

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
