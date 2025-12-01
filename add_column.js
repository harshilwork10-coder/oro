const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "MagicLink" ADD COLUMN "completedAt" DATETIME;`)
        console.log("Successfully added completedAt column")
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log("Column already exists")
        } else {
            console.error(e)
        }
    } finally {
        await prisma.$disconnect()
    }
}

main()
