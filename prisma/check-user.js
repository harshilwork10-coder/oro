const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    const user = await p.user.findFirst({
        where: { email: 'owner@shubh.com' }
    })

    if (!user) {
        console.log('User not found')
        return
    }

    console.log('User ID:', user.id)

    // Check if owns franchisor
    const franchisor = await p.franchisor.findFirst({
        where: { ownerId: user.id }
    })

    if (franchisor) {
        console.log('Owns Franchisor:', franchisor.id, '-', franchisor.name)
    } else {
        console.log('Does not own any franchisor directly')

        // Check role assignments
        const roles = await p.roleAssignment.findMany({
            where: { userId: user.id, franchisorId: { not: null } }
        })
        console.log('Role assignments:', roles.map(r => r.franchisorId))
    }
}

main().finally(() => p.$disconnect())
