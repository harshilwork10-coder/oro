import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Find the client "mikes"
    const client = await prisma.franchisor.findFirst({
        where: { name: 'mikes' },
        include: { owner: true }
    })

    if (!client) {
        console.log('Client "mikes" not found')
        return
    }

    console.log(`Found client: ${client.name} (${client.id})`)
    console.log(`Owner: ${client.owner.email} (${client.ownerId})`)

    try {
        console.log('Deleting related data...')

        await prisma.lead.deleteMany({ where: { franchisorId: client.id } })
        console.log('✓ Leads')

        await prisma.territory.deleteMany({ where: { franchisorId: client.id } })
        console.log('✓ Territories')

        await prisma.globalService.deleteMany({ where: { franchisorId: client.id } })
        console.log('✓ Global Services')

        await prisma.globalProduct.deleteMany({ where: { franchisorId: client.id } })
        console.log('✓ Global Products')

        await prisma.royaltyConfig.deleteMany({ where: { franchisorId: client.id } })
        console.log('✓ Royalty Config')

        await prisma.franchise.deleteMany({ where: { franchisorId: client.id } })
        console.log('✓ Franchises')

        await prisma.franchisor.delete({ where: { id: client.id } })
        console.log('✓ Franchisor')

        await prisma.magicLink.deleteMany({ where: { userId: client.ownerId } })
        console.log('✓ Magic Links')

        await prisma.user.delete({ where: { id: client.ownerId } })
        console.log('✓ User')

        console.log('✅ Successfully deleted client!')
    } catch (error) {
        console.error('❌ Error deleting:', error)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
