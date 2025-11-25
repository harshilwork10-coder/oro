import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'employee@downtown.com' },
            include: { location: true, franchise: true }
        })
        console.log('----------------------------------------')
        console.log('User Verification:')
        console.log('Email:', user?.email)
        console.log('Role:', user?.role)
        console.log('Location ID:', user?.locationId)
        console.log('Franchise ID:', user?.franchiseId)
        console.log('Location Name:', user?.location?.name)
        console.log('----------------------------------------')
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
