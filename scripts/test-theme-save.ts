import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
    // Simulate what the PUT endpoint does
    const franchiseId = 'cmkkgkw20000913dahqiw9yx4' // mike's franchise

    console.log('=== Before Update ===')
    const before = await p.location.findMany({
        where: { franchiseId },
        select: { id: true, name: true, themeId: true }
    })
    console.log(JSON.stringify(before, null, 2))

    // Try the updateMany - same as what the PUT does
    const result = await p.location.updateMany({
        where: { franchiseId },
        data: { themeId: 'oro_orange' }
    })
    console.log('\n=== UpdateMany Result ===')
    console.log(JSON.stringify(result, null, 2))

    console.log('\n=== After Update ===')
    const after = await p.location.findMany({
        where: { franchiseId },
        select: { id: true, name: true, themeId: true }
    })
    console.log(JSON.stringify(after, null, 2))
}

main().catch(console.error).finally(() => p.$disconnect())
