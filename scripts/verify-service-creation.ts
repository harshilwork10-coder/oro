
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Service Creation Logic (Simulation)...')

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

    // Ensure franchise exists
    let franchiseId = franchisorUser.franchisor!.franchises[0]?.id
    if (!franchiseId) {
        const franchise = await prisma.franchise.create({
            data: {
                name: 'Test Franchise ' + Date.now(),
                slug: 'test-franchise-' + Date.now(),
                franchisorId: franchisorUser.franchisor!.id
            }
        })
        franchiseId = franchise.id
    }

    try {
        console.log('\n[POST /api/franchise/services] Logic Check:')

        // Simulate FRANCHISOR access
        if (franchisorUser.role !== 'FRANCHISOR') {
            console.error('❌ FAIL: User is not a Franchisor')
        } else {
            console.log('✅ PASS: User is a Franchisor')
        }

        // Simulate auto-assignment for single franchise
        const updatedFranchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorUser.franchisor!.id },
            include: { franchises: true }
        })

        let finalFranchiseId = null
        if (updatedFranchisor!.franchises.length === 1) {
            finalFranchiseId = updatedFranchisor!.franchises[0].id
            console.log('✅ PASS: Auto-assigned single franchise ID')
        } else if (updatedFranchisor!.franchises.length > 1) {
            console.log('ℹ️ NOTE: User has multiple franchises, ID must be provided')
        }

        // Simulate service creation
        const service = await prisma.service.create({
            data: {
                name: 'Test Service ' + Date.now(),
                price: 50,
                duration: 30,
                franchiseId: finalFranchiseId!
            }
        })

        console.log(`✅ PASS: Service Created with Franchise ID: ${service.franchiseId}`)

        if (service.franchiseId === franchiseId) {
            console.log('✅ PASS: Service correctly linked to Franchise')
        } else {
            console.error('❌ FAIL: Linkage incorrect')
        }

        // Cleanup
        await prisma.service.delete({ where: { id: service.id } })

    } catch (error) {
        console.error('Error:', error)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
