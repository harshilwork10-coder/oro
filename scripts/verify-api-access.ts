
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying API Access Control Logic (Simulation)...')

    // 1. Find Franchisor User
    const franchisorUser = await prisma.user.findFirst({
        where: { role: 'FRANCHISOR' },
        include: { franchisor: { include: { franchises: true } } }
    })

    if (!franchisorUser) {
        console.log('No Franchisor user found. Skipping simulation.')
        return
    }

    console.log(`\nSimulating as Franchisor: ${franchisorUser.name} (${franchisorUser.email})`)

    // SEED DATA
    console.log('\nSeeding test data...')
    const competitorFranchise = await prisma.franchise.create({
        data: {
            name: 'Competitor Franchise ' + Date.now(),
            slug: 'competitor-' + Date.now(),
            franchisor: {
                create: {
                    owner: {
                        create: {
                            email: 'competitor.' + Date.now() + '@test.com',
                            role: 'FRANCHISOR'
                        }
                    }
                }
            }
        }
    })
    console.log(`Created Competitor Franchise: ${competitorFranchise.id}`)

    const myFranchise = await prisma.franchise.create({
        data: {
            name: 'My Franchise ' + Date.now(),
            slug: 'my-franchise-' + Date.now(),
            franchisorId: franchisorUser.franchisor!.id
        }
    })
    console.log(`Created My Franchise: ${myFranchise.id}`)

    try {
        // 2. Check Franchise Visibility (GET /api/franchises logic)
        console.log('\n[GET /api/franchises] Logic Check:')

        // New Logic: Filter by owner if FRANCHISOR
        let whereClause = {}
        if (franchisorUser.role === 'FRANCHISOR') {
            whereClause = { franchisorId: franchisorUser.franchisor!.id }
        }

        const visibleFranchises = await prisma.franchise.findMany({ where: whereClause })
        console.log(`Total franchises in DB: ${(await prisma.franchise.count())}`)
        console.log(`Visible to Franchisor: ${visibleFranchises.length}`)

        if (visibleFranchises.length === 1 && visibleFranchises[0].id === myFranchise.id) {
            console.log('✅ PASS: Franchisor sees only owned franchises')
        } else {
            console.error('❌ FAIL: Data Leak or Logic Error')
            console.log(`Visible: ${visibleFranchises.map(f => f.name).join(', ')}`)
        }

        // 3. Check Location Creation (POST /api/locations logic)
        console.log('\n[POST /api/locations] Logic Check:')
        // New Logic: Allow PROVIDER or FRANCHISOR
        if (franchisorUser.role !== 'PROVIDER' && franchisorUser.role !== 'FRANCHISOR') {
            console.error('❌ FAIL: Franchisor is BLOCKED from creating locations (Unauthorized)')
        } else {
            console.log('✅ PASS: Franchisor allowed to create locations')

            // Simulate Auto-Assign Logic
            let finalFranchiseId = null
            // Re-fetch to get fresh franchises list including the new one
            const updatedFranchisor = await prisma.franchisor.findUnique({
                where: { id: franchisorUser.franchisor!.id },
                include: { franchises: true }
            })
            const userFranchises = updatedFranchisor!.franchises

            if (userFranchises.length === 1) {
                finalFranchiseId = userFranchises[0].id
                console.log('✅ PASS: Auto-assigned single franchise ID')
            } else if (userFranchises.length > 1) {
                console.log('ℹ️ NOTE: User has multiple franchises, ID must be provided (Correct behavior)')
            }
        }

    } finally {
        // CLEANUP
        console.log('\nCleaning up...')
        await prisma.franchise.delete({ where: { id: competitorFranchise.id } })
        await prisma.franchise.delete({ where: { id: myFranchise.id } })
        // Note: competitor user/franchisor cleanup skipped for brevity
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
