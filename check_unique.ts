
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const id = 'cmirqbvo40002k4p24errhs92'
    console.log(`Checking ID: ${id}`)
    const f = await prisma.franchisor.findUnique({
        where: { id },
        include: { owner: true }
    })
    console.log('Found:', f ? 'YES' : 'NO')
    if (f) {
        console.log(`Name: ${f.name}`)
        console.log(`Owner: ${f.owner.email}`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
