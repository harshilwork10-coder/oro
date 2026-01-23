/**
 * Set test passwords for role testing
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const testPassword = '123456';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    console.log('Setting password "123456" for test users...\n');

    // Update test users
    const testUsers = [
        'admin@oro9.com',      // PROVIDER
        'salon@user.com',      // FRANCHISOR - owns "salon llc" brand
        'owner@shubh.com',     // FRANCHISOR - owns "Shubh LLC" brand
        'mike@shubh.com'       // FRANCHISEE - owns "nice llc" franchise
    ];

    for (const email of testUsers) {
        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });
        console.log(`✅ ${user.role}: ${email} - password set to "123456"`);
    }

    console.log('\n=== TEST ACCOUNTS READY ===');
    console.log('PROVIDER:   admin@oro9.com / 123456');
    console.log('FRANCHISOR: salon@user.com / 123456 (owns "salon llc" brand)');
    console.log('FRANCHISOR: owner@shubh.com / 123456 (owns "Shubh LLC" brand)');
    console.log('FRANCHISEE: mike@shubh.com / 123456 (owns "nice llc" franchise)');

    await prisma.$disconnect();
}

main();
