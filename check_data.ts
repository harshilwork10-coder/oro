
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const franchisors = await prisma.franchisor.findMany({
        include: { owner: true }
    })
    console.log('--- DATA CHECK ---')
    console.log(`Total Franchisors: ${franchisors.length}`)
    franchisors.forEach(f => {
        console.log(`- [${f.id}] ${f.name} (Owner: ${f.owner.email}, Status: ${f.approvalStatus})`)
    })
    console.log('------------------')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
