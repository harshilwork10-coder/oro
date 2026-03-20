import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
    const u = await p.user.findFirst({
        where: { email: 'mike@shubh.com' },
        select: { id: true, email: true, role: true, franchiseId: true, locationId: true }
    })
    console.log('USER:', JSON.stringify(u, null, 2))

    if (u?.franchiseId) {
        const locs = await p.location.findMany({
            where: { franchiseId: u.franchiseId },
            select: { id: true, name: true, themeId: true, highContrast: true }
        })
        console.log('LOCATIONS:', JSON.stringify(locs, null, 2))
    } else {
        console.log('NO FRANCHISE ID!')
    }
}

main().catch(console.error).finally(() => p.$disconnect())
