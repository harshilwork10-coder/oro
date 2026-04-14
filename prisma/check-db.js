const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    const admin = await p.user.findFirst({ where: { email: 'admin@oro9.com' } });
    console.log('Admin:', admin);
    
    // Check if provider entity exists
    const provider = await p.provider.findFirst();
    console.log('Provider:', provider);
    
    // Test if admin has the right role
    if (admin) {
        console.log('Admin role is:', admin.role);
    }
}
main().finally(() => p['$disconnect']());
