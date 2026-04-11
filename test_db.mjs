import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 
async function run() { 
    const loc = await prisma.location.findFirst({where: {slug: 'shubh-beauty-scamburg'}}); 
    console.log(loc); 
    await prisma.$disconnect(); 
} 
run();
