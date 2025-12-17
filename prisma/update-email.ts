import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateEmail() {
    const user = await prisma.user.update({
        where: { email: 'provider@test.com' },
        data: {
            email: 'admin@oronex.com',
            name: 'Oronex Admin'
        }
    })
    console.log('✅ Updated provider account!')
    console.log('   Email: admin@oronex.com')
    console.log('   Password: password123')
    await prisma.$disconnect()
}

updateEmail().catch(e => {
    console.error(e)
    process.exit(1)
})
