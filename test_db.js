require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    try {
        const location = await prisma.location.findFirst({where: {slug: 'shubh-beauty-scamburg'}});
        if (!location) {
            console.log('not found');
            return;
        }
        let checkinUrl = null;
        if (location.businessType === 'SALON' && location.slug) {
            const mod = await import('./src/lib/checkinToken.ts');
            checkinUrl = mod.buildCheckinUrl(location.slug, process.env.NEXTAUTH_URL || 'http://localhost:3001');
        }
        console.log('CHECKIN_URL:', checkinUrl);
    } catch(e) {
        console.error('ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
run();
