const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='Transaction'`;
    console.log("COLUMNS:");
    console.log(res.map(r => r.column_name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
