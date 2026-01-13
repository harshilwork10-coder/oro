const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Deleting all customers...')
    const result = await prisma.client.deleteMany()
    console.log(`Deleted ${result.count} customers`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
