// Quick script to enable Pulse for a franchisor
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function enablePulse() {
    // Find all franchisors
    const franchisors = await prisma.franchisor.findMany({
        include: {
            owner: { select: { id: true, email: true, name: true } },
            config: true
        }
    })

    console.log('\n=== FRANCHISORS ===')
    franchisors.forEach((f, i) => {
        console.log(`${i + 1}. ${f.name || 'Unnamed'} - Owner: ${f.owner?.email}`)
        console.log(`   Config exists: ${!!f.config}`)
        if (f.config) {
            console.log(`   usesMobilePulse: ${f.config.usesMobilePulse}`)
            console.log(`   pulseSeatCount: ${f.config.pulseSeatCount}`)
        }
    })

    // Enable Pulse for first franchisor (or all)
    for (const franchisor of franchisors) {
        if (franchisor.config) {
            await prisma.businessConfig.update({
                where: { id: franchisor.config.id },
                data: {
                    usesMobilePulse: true,
                    pulseSeatCount: 5 // Give them 5 seats
                }
            })
            console.log(`\n✅ Enabled Pulse for ${franchisor.name || franchisor.owner?.email}`)

            // Also enable the owner's hasPulseAccess
            if (franchisor.owner) {
                await prisma.user.update({
                    where: { id: franchisor.owner.id },
                    data: { hasPulseAccess: true }
                })
                console.log(`✅ Gave Pulse seat to owner: ${franchisor.owner.email}`)
            }
        } else {
            // Create config if doesn't exist
            await prisma.businessConfig.create({
                data: {
                    franchisorId: franchisor.id,
                    usesMobilePulse: true,
                    pulseSeatCount: 5,
                    posMode: 'RETAIL'
                }
            })
            console.log(`\n✅ Created config and enabled Pulse for ${franchisor.name}`)

            if (franchisor.owner) {
                await prisma.user.update({
                    where: { id: franchisor.owner.id },
                    data: { hasPulseAccess: true }
                })
                console.log(`✅ Gave Pulse seat to owner: ${franchisor.owner.email}`)
            }
        }
    }

    console.log('\n=== DONE ===')
    console.log('Login as the owner email above to test Pulse!')
}

enablePulse()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
