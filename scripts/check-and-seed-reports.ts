/**
 * Check database state and seed sample transaction data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n📊 DATABASE CHECK\n');

    // Check locations
    const locations = await prisma.location.findMany({
        select: { id: true, name: true, provisioningStatus: true, franchiseId: true }
    });
    console.log(`Locations: ${locations.length}`);
    locations.slice(0, 5).forEach(l => {
        console.log(`  - ${l.name} (${l.provisioningStatus})`);
    });

    // Check franchises
    const franchises = await prisma.franchise.findMany({
        select: { id: true, name: true }
    });
    console.log(`\nFranchises: ${franchises.length}`);
    franchises.slice(0, 3).forEach(f => {
        console.log(`  - ${f.name} (${f.id})`);
    });

    // Check transactions
    const txCount = await prisma.transaction.count();
    const todayTxCount = await prisma.transaction.count({
        where: {
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
    });
    console.log(`\nTransactions: ${txCount} total, ${todayTxCount} today`);

    // Check appointments
    const apptCount = await prisma.appointment.count();
    console.log(`Appointments: ${apptCount}`);

    // If no data today, seed some sample data
    if (franchises.length > 0 && todayTxCount === 0) {
        console.log('\n🌱 SEEDING SAMPLE DATA...\n');

        const franchise = franchises[0];

        // Create sample transactions for today
        for (let i = 0; i < 15; i++) {
            const total = Math.floor(Math.random() * 200) + 30; // $30-$230
            const tip = Math.floor(total * 0.15); // 15% tip
            const tax = Math.floor(total * 0.08);
            const subtotal = total - tip - tax;

            await prisma.transaction.create({
                data: {
                    franchiseId: franchise.id,
                    subtotal: subtotal,
                    tax: tax,
                    tip: tip,
                    discount: 0,
                    total: total,
                    paymentMethod: i % 3 === 0 ? 'CASH' : 'CREDIT_CARD',
                    status: i === 14 ? 'REFUNDED' : 'COMPLETED',
                    source: 'WEB_POS',
                    createdAt: new Date(Date.now() - i * 1000 * 60 * 20) // Every 20 min
                }
            });
        }
        console.log(`✅ Created 15 sample transactions`);

        // Update a location to ACTIVE if none are active
        const activeCount = await prisma.location.count({ where: { provisioningStatus: 'ACTIVE' } });
        if (activeCount === 0 && locations.length > 0) {
            await prisma.location.update({
                where: { id: locations[0].id },
                data: { provisioningStatus: 'ACTIVE' }
            });
            console.log(`✅ Set ${locations[0].name} to ACTIVE`);
        } else {
            console.log(`✅ ${activeCount} location(s) already ACTIVE`);
        }

        console.log('\n✅ DONE! Refresh the HQ Reports page to see data.\n');
    } else if (franchises.length === 0) {
        console.log('\n⚠️ No franchises found. Run seed script first.');
    } else {
        console.log('\n✅ Data already exists for today. No seeding needed.');
        console.log('   To re-seed, delete today\'s transactions first.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
