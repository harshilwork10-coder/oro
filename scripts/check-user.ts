const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    // Find active users with franchise
    const users = await p.user.findMany({
        where: { franchiseId: { not: null }, isActive: true },
        select: { id: true, email: true, role: true, franchiseId: true, locationId: true, isActive: true },
        take: 10
    })
    console.log('ACTIVE USERS WITH FRANCHISE:')
    users.forEach((u: any) => console.log('  ' + u.role + ' | ' + u.email + ' | fid=' + u.franchiseId + ' | loc=' + u.locationId + ' | active=' + u.isActive))
    
    if (users.length === 0) {
        console.log('NO ACTIVE USERS FOUND')
        // Find ANY user
        const anyUsers = await p.user.findMany({
            where: { franchiseId: { not: null } },
            select: { id: true, email: true, role: true, franchiseId: true, locationId: true, isActive: true },
            take: 10
        })
        console.log('\nALL USERS WITH FRANCHISE:')
        anyUsers.forEach((u: any) => console.log('  ' + u.role + ' | ' + u.email + ' | active=' + u.isActive))
    }
    
    await p.$disconnect()
}
main().catch(console.error)
