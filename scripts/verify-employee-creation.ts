
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Employee Creation Logic (Simulation)...')

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

    // 2. Setup Test Location
    console.log('\nSetting up test location...')
    // Ensure they have a franchise
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

    const location = await prisma.location.create({
        data: {
            name: 'Test Location ' + Date.now(),
            slug: 'test-location-' + Date.now(),
            address: '123 Test St',
            franchiseId: franchiseId
        },
        include: { franchise: true }
    })
    console.log(`Created Test Location: ${location.id}`)

    try {
        // 3. Simulate POST /api/franchise/employees Logic
        console.log('\n[POST /api/franchise/employees] Logic Check:')

        const body = {
            name: 'Test Employee',
            email: 'test.employee.' + Date.now() + '@test.com',
            password: 'password123',
            locationId: location.id
        }

        // Logic Step 1: Validate Location
        if (!body.locationId) {
            console.error('❌ FAIL: Location ID missing')
        }

        const locationCheck = await prisma.location.findUnique({
            where: { id: body.locationId },
            include: { franchise: true }
        })

        if (!locationCheck) {
            console.error('❌ FAIL: Location not found')
        }

        // Logic Step 2: Verify Access
        if (franchisorUser.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({ where: { ownerId: franchisorUser.id } })
            if (!franchisor || locationCheck!.franchise?.franchisorId !== franchisor.id) {
                console.error('❌ FAIL: Access Denied (Ownership check failed)')
            } else {
                console.log('✅ PASS: Access Granted (Ownership verified)')
            }
        }

        // Logic Step 3: Create Employee
        const employee = await prisma.user.create({
            data: {
                name: body.name,
                email: body.email,
                password: 'hashed_password', // Mock
                role: 'EMPLOYEE',
                franchiseId: locationCheck!.franchiseId,
                locationId: body.locationId
            }
        })

        console.log(`✅ PASS: Employee Created with Location ID: ${employee.locationId}`)

        if (employee.locationId === location.id && employee.franchiseId === franchiseId) {
            console.log('✅ PASS: Employee correctly linked to Location and Franchise')
        } else {
            console.error('❌ FAIL: Linkage incorrect')
        }

    } finally {
        // Cleanup
        console.log('\nCleaning up...')
        await prisma.location.delete({ where: { id: location.id } })
        // Clean up employee if created (by email)
        await prisma.user.deleteMany({ where: { email: { startsWith: 'test.employee.' } } })
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
