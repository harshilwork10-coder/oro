const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const franchises = await p.franchise.findMany({
        include: { franchisor: true }
    });

    console.log('=== ALL FRANCHISES IN DATABASE ===');
    franchises.forEach(f => {
        console.log(`- ${f.name} | FranchisorId: ${f.franchisorId} | Franchisor: ${f.franchisor?.name || 'NONE'}`);
    });

    const franchisors = await p.franchisor.findMany();
    console.log('\n=== ALL FRANCHISORS ===');
    franchisors.forEach(fr => {
        console.log(`- ${fr.name} | ID: ${fr.id}`);
    });
}

main().finally(() => p.$disconnect());
