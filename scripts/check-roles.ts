import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({ select: { email: true, role: true, franchiseId: true } });
    const franchisors = await prisma.franchisor.findMany({ select: { id: true, name: true, ownerId: true } });
    const franchises = await prisma.franchise.findMany({ select: { id: true, name: true, franchisorId: true } });
    const locations = await prisma.location.findMany({ select: { name: true, franchiseId: true, franchisorId: true } });

    console.log(JSON.stringify({ users, franchisors, franchises, locations }, null, 2));
    await prisma.$disconnect();
}
main();
