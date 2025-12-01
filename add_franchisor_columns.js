const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const columns = [
        'address', 'phone', 'corpName', 'corpAddress',
        'ssn', 'fein', 'ss4', 'ebt', 'documents'
    ]

    for (const col of columns) {
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Franchisor" ADD COLUMN "${col}" TEXT;`)
            console.log(`Added column ${col}`)
        } catch (e) {
            if (e.message.includes("duplicate column name")) {
                console.log(`Column ${col} already exists`)
            } else {
                console.error(`Error adding ${col}:`, e.message)
            }
        }
    }

    await prisma.$disconnect()
}

main()
