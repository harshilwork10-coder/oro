/**
 * Fix OroNext branding to ORO 9 in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n🔧 FIXING ORONEXT → ORO 9 BRANDING\n');

    // Find users with OroNext in name
    const users = await prisma.user.findMany({
        where: { name: { contains: 'OroNext' } },
        select: { id: true, name: true, email: true }
    });

    console.log(`Found ${users.length} users with OroNext in name`);

    for (const user of users) {
        const newName = user.name?.replace(/OroNext/gi, 'ORO 9') || 'ORO 9 Admin';
        await prisma.user.update({
            where: { id: user.id },
            data: { name: newName }
        });
        console.log(`  ✅ ${user.name} → ${newName}`);
    }

    // Find franchises with old branding
    const franchises = await prisma.franchise.findMany({
        where: { name: { contains: 'OroNext' } },
        select: { id: true, name: true }
    });

    for (const f of franchises) {
        const newName = f.name.replace(/OroNext/gi, 'ORO 9');
        await prisma.franchise.update({
            where: { id: f.id },
            data: { name: newName }
        });
        console.log(`  ✅ Franchise: ${f.name} → ${newName}`);
    }

    console.log('\n✅ Done! Log out and back in to see changes.\n');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
