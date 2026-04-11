const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const loc = await prisma.location.findFirst({where: {slug: 'shubh-beauty-scamburg'}});
    console.log(loc.slug, loc.businessType);
    await prisma.$disconnect();
}
run();
