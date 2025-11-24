import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Checking Database Readiness for POS Testing...')

    const franchisee = await prisma.user.findFirst({
        where: { role: 'FRANCHISEE' },
        include: { franchise: true }
    })

    if (!franchisee) {
        console.error('❌ No Franchisee user found! Please run "npx prisma db seed".')
        return
    }

    console.log(`✅ Franchisee Found: ${franchisee.email} (Franchise: ${franchisee.franchise?.name})`)

    const services = await prisma.service.findMany({
        where: { franchiseId: franchisee.franchiseId! }
    })

    console.log(`✅ Services Available: ${services.length}`)
    if (services.length > 0) {
        console.log(`   - Example: ${services[0].name} ($${services[0].price})`)
    } else {
        console.warn('⚠️ No services found for this franchise.')
    }

    const products = await prisma.product.findMany({
        where: { franchiseId: franchisee.franchiseId! }
    })

    console.log(`✅ Products Available: ${products.length}`)

    console.log('\n🚀 System is ready for manual testing!')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
