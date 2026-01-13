
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Simulating POS Init API for Employee ---')
    const email = 'employee@gmail.com'
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) return console.error('Employee not found')
    console.log('User:', user.email, 'Franchise:', user.franchiseId)

    const franchiseId = user.franchiseId

    // 1. Services
    const services = await prisma.service.findMany({
        where: { franchiseId },
        orderBy: { name: 'asc' },
        include: { serviceCategory: { select: { name: true } } }
    })

    // Format like API
    const formattedServices = services.map(s => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        category: s.serviceCategory?.name || 'Services'
    }))

    console.log('\nAPI Response Preview (Services):')
    console.log(JSON.stringify(formattedServices, null, 2))

    // 2. Categories derived
    const categories = new Set()
    formattedServices.forEach(s => categories.add(s.category))
    console.log('\nDerived Categories:', Array.from(categories))
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
