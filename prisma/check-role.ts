import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAndFixRole() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@oronex.com' }
    })

    if (!user) {
        console.log('❌ User not found!')
        return
    }

    console.log('Current user:')
    console.log('  Email:', user.email)
    console.log('  Name:', user.name)
    console.log('  Role:', user.role)

    if (user.role !== 'PROVIDER') {
        console.log('\n⚠️  Role is NOT PROVIDER! Fixing...')
        await prisma.user.update({
            where: { email: 'admin@oronex.com' },
            data: { role: 'PROVIDER' }
        })
        console.log('✅ Role updated to PROVIDER')
    } else {
        console.log('\n✅ Role is correctly set to PROVIDER')
    }

    await prisma.$disconnect()
}

checkAndFixRole().catch(e => {
    console.error(e)
    process.exit(1)
})
