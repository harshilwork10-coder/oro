const { PrismaClient } = require('@prisma/client')

async function main() {
    const prisma = new PrismaClient()

    // Get all franchises
    const franchises = await prisma.franchise.findMany({
        select: { id: true, name: true, slug: true }
    })

    console.log('Current Franchises:')
    franchises.forEach(f => console.log(`  - ${f.name} (slug: ${f.slug})`))

    if (franchises.length > 0) {
        // Update the first franchise to have slug 'mikescafe'
        const updated = await prisma.franchise.update({
            where: { id: franchises[0].id },
            data: { slug: 'mikescafe' }
        })
        console.log(`\n✅ Updated "${updated.name}" to slug: mikescafe`)
        console.log(`\n📅 Booking URL: http://localhost:3000/book/mikescafe`)
    }

    await prisma.$disconnect()
}

main()
