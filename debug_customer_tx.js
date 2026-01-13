const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Searching for "Test Customer"...')

        // 1. Find the customer
        const customers = await prisma.client.findMany({
            where: {
                OR: [
                    { firstName: { contains: 'Test', mode: 'insensitive' } },
                    { lastName: { contains: 'Test', mode: 'insensitive' } },
                    { firstName: { contains: 'Texst', mode: 'insensitive' } }
                ]
            }
        })

        if (customers.length === 0) {
            console.log('No customers found matching "Test"')
            return
        }

        console.log(`Found ${customers.length} customers. Checking the first one: ${customers[0].firstName} ${customers[0].lastName} (${customers[0].id})`)
        const customerId = customers[0].id

        // 2. Find last transaction globally
        const lastTx = await prisma.transaction.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                lineItems: true,
                client: true // Include client info to see if it was linked
            }
        })

        if (!lastTx) {
            console.log('No transactions found in DB.')
            return
        }

        console.log('--- Latest Transaction (Global) ---')
        console.log(`ID: ${lastTx.id}`)
        console.log(`Client: ${lastTx.client ? (lastTx.client.firstName + ' ' + lastTx.client.lastName) : 'None'}`)
        console.log(`Invoice: ${lastTx.invoiceNumber}`)
        console.log(`Total: ${lastTx.total}`)
        console.log(`Created: ${lastTx.createdAt}`)
        console.log('--- Line Items ---')
        lastTx.lineItems.forEach((item, index) => {
            console.log(`#${index + 1}: Type=${item.type}, NameSnapshot="${item.serviceNameSnapshot || item.productNameSnapshot}", Price=${item.price}, Total=${item.total}`)
        })

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
