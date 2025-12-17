import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testPin() {
    const testPin = '1234'

    const employees = await prisma.user.findMany({
        where: {
            role: 'EMPLOYEE',
            pin: { not: null }
        }
    })

    console.log('Testing PIN:', testPin)
    console.log('---')

    for (const emp of employees) {
        if (emp.pin) {
            const isValid = await bcrypt.compare(testPin, emp.pin)
            console.log(`${emp.email}: PIN match = ${isValid}`)
        }
    }

    await prisma.$disconnect()
}

testPin().catch(e => {
    console.error(e)
    process.exit(1)
})
