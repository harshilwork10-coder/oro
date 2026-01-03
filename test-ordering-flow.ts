// Test Script for Tesla-Style Ordering System
// Run this with: npx ts-node test-ordering-flow.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testOrderingFlow() {
    console.log('🧪 Testing Tesla-Style Ordering System...\n')

    try {
        // 1. Check if LicenseRequest model exists
        console.log('✅ Step 1: Verifying database schema...')
        const requestCount = await prisma.licenseRequest.count()
        console.log(`   Found ${requestCount} license requests in database\n`)

        // 2. Check if we have test data
        console.log('✅ Step 2: Checking for test franchisor...')
        const franchisor = await prisma.franchisor.findFirst({
            include: {
                owner: true,
                locations: true
            }
        })

        if (!franchisor) {
            console.log('   ⚠️  No franchisor found. Please create one first.\n')
            return
        }

        console.log(`   Found franchisor: ${franchisor.name}`)
        console.log(`   Owner: ${franchisor.owner?.name}`)
        console.log(`   Locations: ${franchisor.locations?.length || 0}\n`)

        // 3. Check if location exists
        if (!franchisor.locations || franchisor.locations.length === 0) {
            console.log('   ⚠️  No locations found. Please create a location first.\n')
            return
        }

        const location = franchisor.locations[0]
        console.log('✅ Step 3: Test location found')
        console.log(`   Location: ${location.name}\n`)

        // 4. Check for existing requests
        console.log('✅ Step 4: Checking existing requests...')
        const existingRequests = await prisma.licenseRequest.findMany({
            where: { franchisorId: franchisor.id },
            include: { location: true }
        })
        console.log(`   Found ${existingRequests.length} existing requests`)

        if (existingRequests.length > 0) {
            console.log('\n   Recent requests:')
            existingRequests.slice(0, 3).forEach((req, i) => {
                console.log(`   ${i + 1}. ${req.location?.name} - ${req.numberOfStations} stations - Status: ${req.status}`)
                if (req.contractSignedAt) {
                    console.log(`      Contract signed: ${req.contractSignedAt.toLocaleDateString()}`)
                }
                if (req.shippingStatus) {
                    console.log(`      Shipping: ${req.shippingStatus}${req.trackingNumber ? ' - ' + req.trackingNumber : ''}`)
                }
            })
        }
        console.log('')

        // 5. Check licenses
        console.log('✅ Step 5: Checking generated licenses...')
        const licenses = await prisma.license.findMany({
            where: { franchisorId: franchisor.id },
            include: { location: true }
        })
        console.log(`   Found ${licenses.length} licenses`)

        if (licenses.length > 0) {
            const activeLicenses = licenses.filter(l => l.status === 'ACTIVE').length
            const pendingLicenses = licenses.filter(l => l.status === 'PENDING').length
            console.log(`   Active: ${activeLicenses}, Pending: ${pendingLicenses}\n`)
        }

        // 6. API Endpoints Check
        console.log('✅ Step 6: API Endpoints to test:')
        console.log('   Franchisor APIs:')
        console.log('   - POST /api/franchisor/requests')
        console.log('   - GET  /api/franchisor/my-orders')
        console.log('   - POST /api/franchisor/requests/[id]/sign')
        console.log('')
        console.log('   Admin APIs:')
        console.log('   - GET  /api/admin/requests')
        console.log('   - POST /api/admin/requests/[id]/approve')
        console.log('   - POST /api/admin/requests/[id]/ship')
        console.log('   - GET  /api/admin/shipping/pending\n')

        // 7. UI Pages Check
        console.log('✅ Step 7: UI Pages to visit:')
        console.log('   Franchisor:')
        console.log('   - /dashboard/locations (Click Monitor icon)')
        console.log('   - /dashboard/my-orders')
        console.log('   - /dashboard/requests/[id]/contract')
        console.log('')
        console.log('   Admin:')
        console.log('   - /dashboard/terminals (Pending Requests tab)')
        console.log('   - /dashboard/shipping\n')

        console.log('🎉 All checks passed! System is ready to test.\n')
        console.log('📝 Next Steps:')
        console.log('1. Start your dev server: npm run dev')
        console.log('2. Log in as a franchisor')
        console.log('3. Go to Locations → Click Monitor icon → Request stations')
        console.log('4. Log in as admin → Approve the request')
        console.log('5. Log back as franchisor → Check "My Orders"\n')

    } catch (error) {
        console.error('❌ Error during testing:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testOrderingFlow()
