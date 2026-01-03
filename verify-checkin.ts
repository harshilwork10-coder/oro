import { prisma } from './src/lib/prisma'

async function main() {
    console.log('🚀 Starting Check-in Flow Verification...')

    try {
        // 1. Create Test Franchise/User (if needed, or use existing)
        // For simplicity, we'll assume a franchise exists or create a dummy one
        console.log('Setting up test franchise...')
        const franchisor = await prisma.franchisor.create({
            data: {
                name: 'Test Franchisor',
                owner: {
                    create: {
                        email: `test-owner-${Date.now()}@example.com`,
                        role: 'FRANCHISOR'
                    }
                }
            }
        })

        const franchise = await prisma.franchise.create({
            data: {
                name: 'Test Franchise',
                slug: `test-franchise-${Date.now()}`,
                franchisorId: franchisor.id
            }
        })

        // 2. Create Client (Customer) with new fields
        console.log('Creating test client with liability and loyalty...')
        const client = await prisma.client.create({
            data: {
                firstName: 'Test',
                lastName: 'User',
                phone: '5550001111',
                email: `test-client-${Date.now()}@example.com`,
                franchiseId: franchise.id,
                liabilitySigned: true,
                loyaltyJoined: true
            }
        })
        console.log(`✅ Created client: ${client.id}`)

        // 3. Verify Fields
        console.log('Verifying client fields...')
        const fetchedClient = await prisma.client.findUnique({
            where: { id: client.id }
        })

        if (fetchedClient) {
            console.log(`Liability Signed: ${fetchedClient.liabilitySigned}`)
            console.log(`Loyalty Joined: ${fetchedClient.loyaltyJoined}`)

            if (fetchedClient.liabilitySigned === true && fetchedClient.loyaltyJoined === true) {
                console.log('✅ Fields verified successfully')
            } else {
                console.error('❌ Fields mismatch')
            }
        } else {
            console.error('❌ Failed to retrieve client')
        }

        // Cleanup
        console.log('Cleaning up...')
        await prisma.client.delete({ where: { id: client.id } })
        await prisma.franchise.delete({ where: { id: franchise.id } })
        await prisma.franchisor.delete({ where: { id: franchisor.id } })
        // Note: User cleanup might be tricky due to relations, skipping for now or need cascade

    } catch (error) {
        console.error('❌ Verification Failed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
