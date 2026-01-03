
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting Full Workflow Verification...')

    // --- SCENARIO 1: Admin Approves Franchisor ---
    console.log('\n--- SCENARIO 1: Admin Approves Franchisor ---')

    const ownerEmail = 'verify_workflow_owner@example.com'
    // Cleanup
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } })
    if (existingUser) {
        await prisma.franchisor.deleteMany({ where: { ownerId: existingUser.id } })
        await prisma.user.delete({ where: { id: existingUser.id } })
    }

    console.log('1. Creating Pending Franchisor...')
    const owner = await prisma.user.create({
        data: {
            email: ownerEmail,
            name: 'Workflow Test Owner',
            role: 'FRANCHISOR',
            password: 'hashedpassword'
        }
    })

    const franchisor = await prisma.franchisor.create({
        data: {
            ownerId: owner.id,
            name: 'Workflow Corp',
            approvalStatus: 'PENDING' // Initial state
        }
    })

    console.log(`   Created Franchisor: ${franchisor.name} (Status: ${franchisor.approvalStatus})`)

    console.log('2. Simulating Admin Approval...')
    const approvedFranchisor = await prisma.franchisor.update({
        where: { id: franchisor.id },
        data: { approvalStatus: 'APPROVED' }
    })

    if (approvedFranchisor.approvalStatus === 'APPROVED') {
        console.log('✅ SUCCESS: Franchisor approved.')
    } else {
        console.error('❌ FAIL: Franchisor not approved.')
        process.exit(1)
    }

    // --- SCENARIO 2: Franchisor Approves Franchise ---
    console.log('\n--- SCENARIO 2: Franchisor Approves Franchise ---')

    console.log('1. Creating Pending Franchise...')
    const franchise1 = await prisma.franchise.create({
        data: {
            name: 'Location A (Pending)',
            slug: 'loc-a-pending',
            franchisorId: franchisor.id,
            approvalStatus: 'PENDING'
        }
    })
    console.log(`   Created Franchise: ${franchise1.name} (Status: ${franchise1.approvalStatus})`)

    console.log('2. Simulating Franchisor Approval...')
    const approvedFranchise = await prisma.franchise.update({
        where: { id: franchise1.id },
        data: { approvalStatus: 'APPROVED' }
    })

    if (approvedFranchise.approvalStatus === 'APPROVED') {
        console.log('✅ SUCCESS: Franchise approved.')
    } else {
        console.error('❌ FAIL: Franchise not approved.')
        process.exit(1)
    }

    // --- SCENARIO 3: Franchisor Rejects Franchise ---
    console.log('\n--- SCENARIO 3: Franchisor Rejects Franchise ---')

    console.log('1. Creating Another Pending Franchise...')
    const franchise2 = await prisma.franchise.create({
        data: {
            name: 'Location B (To Reject)',
            slug: 'loc-b-reject',
            franchisorId: franchisor.id,
            approvalStatus: 'PENDING'
        }
    })

    console.log('2. Simulating Franchisor Rejection...')
    const rejectedFranchise = await prisma.franchise.update({
        where: { id: franchise2.id },
        data: { approvalStatus: 'REJECTED' }
    })

    if (rejectedFranchise.approvalStatus === 'REJECTED') {
        console.log('✅ SUCCESS: Franchise rejected.')
    } else {
        console.error('❌ FAIL: Franchise not rejected.')
        process.exit(1)
    }

    console.log('\n✅ ALL SCENARIOS PASSED')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
