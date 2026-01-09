
const { PrismaClient } = require('@prisma/client')
// Try to load dotenv if available, otherwise assume env is set or will fail
try { require('dotenv').config() } catch (e) { console.log('dotenv not found, relying on process.env') }

const prisma = new PrismaClient()

async function main() {
    // ID from the user's debug report
    const targetId = 'cmk50d5iq0000n7z1ex7pkmaj'
    const targetEmail = 'zxcvb@gmail.com'

    console.log(`Connecting to DB: ${process.env.DATABASE_URL ? 'URL Found' : 'URL MISSING'}`)

    // 1. Try by ID
    let user = await prisma.user.findUnique({ where: { id: targetId } })

    // 2. Fallback to Email
    if (!user) {
        console.log(`User not found by ID ${targetId}. Trying email ${targetEmail}...`)
        user = await prisma.user.findUnique({ where: { email: targetEmail } })
    }

    if (!user) {
        console.error('❌ User STILL not found! Check DATABASE_URL.')
        console.log('Available users:')
        const allUsers = await prisma.user.findMany({ select: { id: true, email: true, role: true } })
        console.table(allUsers)
        return
    }

    console.log(`Found User: ${user.email} (Current Role: ${user.role})`)

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'PROVIDER' }
    })

    console.log(`✅ SUCCESS! Promoted ${updated.email} to ${updated.role}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
