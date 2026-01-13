
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const franchiseId = 'cmk9e643e000piqljygqezd13' // ID seen in logs

    console.log('Checking data for franchise:', franchiseId)

    try {
        console.log('--- Checking Transaction Schema ---')
        try {
            const tx = await prisma.transaction.findFirst({
                include: { lineItems: true }
            })
            if (tx) {
                console.log('Transaction found. Keys:', Object.keys(tx))
                if (tx.lineItems && tx.lineItems.length > 0) {
                    console.log('LineItem found. Keys:', Object.keys(tx.lineItems[0]))
                } else {
                    console.log('No line items found to check keys.')
                }
            } else {
                console.log('No transactions found in DB.')
            }
        } catch (e) {
            console.error('Schema Error reading Transaction:', e.message)
        }

        const employees = await prisma.user.count({ where: { franchiseId, role: 'EMPLOYEE' } })
        console.log('Employees count:', employees)

        const settings = await prisma.franchiseSettings.findFirst({ where: { franchiseId } })
        console.log('Settings found:', !!settings)
        if (settings) {
            console.log('Settings keys:', Object.keys(settings))
        }

    } catch (e) {
        console.error('Error querying DB:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
