const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
    const hash = await bcrypt.hash('admin123', 10)

    await prisma.user.create({
        data: {
            email: 'admin@oro.com',
            name: 'Oro Admin',
            password: hash,
            role: 'PROVIDER'
        }
    })

    console.log('✅ Created admin@oro.com (password: admin123)')
}

createAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
