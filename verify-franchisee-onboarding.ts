
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting verification...')

    // 1. Setup: Ensure we have a Franchisor to own the Franchise
    const ownerEmail = 'verify_test_owner@example.com'
    let owner = await prisma.user.findUnique({ where: { email: ownerEmail } })

    if (!owner) {
        console.log('Creating test owner...')
        owner = await prisma.user.create({
            data: {
                email: ownerEmail,
                name: 'Test Owner',
                role: 'FRANCHISOR',
                password: 'hashedpassword123'
            }
        })
    }

    let franchisor = await prisma.franchisor.findUnique({ where: { ownerId: owner.id } })
    if (!franchisor) {
        console.log('Creating test franchisor...')
        franchisor = await prisma.franchisor.create({
            data: {
                ownerId: owner.id,
                name: 'Test Franchisor Corp',
                approvalStatus: 'APPROVED'
            }
        })
    }

    // 2. Create a Franchisee User and Franchise (Simulate pre-onboarding state)
    const franchiseeEmail = 'verify_franchisee@example.com'
    // Clean up previous run
    await prisma.user.deleteMany({ where: { email: franchiseeEmail } })

    console.log('Creating test franchisee user...')
    const franchiseeUser = await prisma.user.create({
        data: {
            email: franchiseeEmail,
            name: 'Test Franchisee',
            role: 'FRANCHISEE',
            password: 'hashedpassword123'
        }
    })

    console.log('Creating test franchise...')
    const franchise = await prisma.franchise.create({
        data: {
            name: 'Test Franchise Location',
            slug: 'test-franchise-loc',
            franchisorId: franchisor.id,
            approvalStatus: 'PENDING' // Default
        }
    })

    // Link user to franchise (usually done via invite, but manually here)
    await prisma.user.update({
        where: { id: franchiseeUser.id },
        data: { franchiseId: franchise.id }
    })

    // 3. Simulate Onboarding Completion (Update Franchise with processing info)
    console.log('Simulating onboarding completion (updating Franchise)...')

    const processingData = {
        ssn: '123-45-6789',
        fein: '98-7654321',
        routingNumber: '123456789',
        accountNumber: '9876543210',
        voidCheckUrl: 'https://example.com/void-check.png',
        driverLicenseUrl: 'https://example.com/dl.png',
        feinLetterUrl: 'https://example.com/fein.png',
        needToDiscussProcessing: false
    }

    const updatedFranchise = await prisma.franchise.update({
        where: { id: franchise.id },
        data: {
            ...processingData
        }
    })

    // 4. Verify Data
    console.log('Verifying updated franchise data...')

    let success = true
    if (updatedFranchise.ssn !== processingData.ssn) {
        console.error('FAIL: SSN mismatch')
        success = false
    }
    if (updatedFranchise.fein !== processingData.fein) {
        console.error('FAIL: FEIN mismatch')
        success = false
    }
    if (updatedFranchise.voidCheckUrl !== processingData.voidCheckUrl) {
        console.error('FAIL: Document URL mismatch')
        success = false
    }
    if (updatedFranchise.approvalStatus !== 'PENDING') {
        console.error(`FAIL: Approval status is ${updatedFranchise.approvalStatus}, expected PENDING`)
        success = false
    }

    if (success) {
        console.log('✅ SUCCESS: Franchisee onboarding data verified correctly.')
    } else {
        console.error('❌ FAILURE: Verification failed.')
        process.exit(1)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
