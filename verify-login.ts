import { PrismaClient } from '@prisma/client'
import { compare } from 'bcrypt'

const prisma = new PrismaClient()

async function verify() {
    const email = 'admin@example.com'
    const password = 'admin123'

    console.log(`Checking user: ${email}`)

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        console.log('User NOT found in database.')
        return
    }

    console.log('User found:', {
        id: user.id,
        email: user.email,
        role: user.role,
        passwordHash: user.password ? user.password.substring(0, 10) + '...' : 'NO PASSWORD'
    })

    if (!user.password) {
        console.log('User has no password set.')
        return
    }

    const isValid = await compare(password, user.password)
    console.log(`Password '${password}' is valid: ${isValid}`)
}

verify()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
