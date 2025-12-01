
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting role fix...')

    // Find all users who are owners of a Franchisor record
    const franchisors = await prisma.franchisor.findMany({
        include: {
            owner: true
        }
    })

    console.log(`Found ${franchisors.length} franchisors.`)

    for (const franchisor of franchisors) {
        if (franchisor.owner && franchisor.owner.role !== 'FRANCHISOR') {
            console.log(`Updating user ${franchisor.owner.email} (${franchisor.owner.id}) to FRANCHISOR role...`)
            await prisma.user.update({
                where: { id: franchisor.owner.id },
                data: { role: 'FRANCHISOR' }
            })
            console.log('Updated.')
        } else {
            console.log(`User ${franchisor.owner?.email} already has correct role or owner is missing.`)
        }
    }

    console.log('Done.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
