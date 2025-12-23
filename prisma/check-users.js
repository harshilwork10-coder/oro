const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            franchiseId: true,
            locationId: true
        }
    })
    console.log('Users:', JSON.stringify(users, null, 2))

    const franchises = await prisma.franchise.findMany({
        select: { id: true, name: true }
    })
    console.log('Franchises:', JSON.stringify(franchises, null, 2))

    const locations = await prisma.location.findMany({
        select: { id: true, name: true, franchiseId: true }
    })
    console.log('Locations:', JSON.stringify(locations, null, 2))
}

check().catch(console.error).finally(() => prisma.$disconnect())
