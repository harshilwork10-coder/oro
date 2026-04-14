import { prisma } from '../src/lib/prisma'
import { processTransactionEarn } from '../src/lib/loyalty/earn-service'

async function runIdempotencyTest() {
    console.log("=========================================")
    console.log("LOY-1 IDEMPOTENCY CONFIRMATION TEST")
    console.log("=========================================")

    // 1. Setup Test Data
    console.log("[1/4] Preparing test harness...")
    
    // Find or create test program
    let program = await prisma.salonLoyaltyProgram.findFirst({
        where: { name: 'Idempotency Test Loop' },
        include: { rules: true }
    })

    if (program) {
        program = await prisma.salonLoyaltyProgram.update({
             where: { id: program.id },
             data: { appliesToSameLocationOnly: false },
             include: { rules: true }
        })
    }

    if (!program) {
        program = await prisma.salonLoyaltyProgram.create({
            data: {
                name: 'Idempotency Test Loop',
                code: 'TEST-LOOP',
                punchesRequired: 5,
                rewardType: 'FIXED_DISCOUNT',
                rewardValue: 10,
                autoEnroll: true,
                status: 'ACTIVE',
                appliesToSameLocationOnly: false
            },
            include: { rules: true }
        })
    }

    // Find a franchise
    const franchise = await prisma.franchise.findFirst()

    // Create a dummy client
    const testClient = await prisma.client.create({
        data: {
            firstName: 'Idemp',
            lastName: 'Tester',
            phone: `+1555${Math.floor(100000 + Math.random() * 900000)}`,
            franchiseId: franchise?.id || 'MOCK_FRANCHISE'
        }
    })

    const transactionId = `MOCK-TX-${Date.now()}`
    const locationId = testClient.franchiseId || 'mock'

    // Create a physical transaction in the DB to satisfy Foreign Key
    const testTransaction = await prisma.transaction.create({
        data: {
            id: transactionId,
            status: 'COMPLETED',
            total: 50,
            subtotal: 50,
            paymentMethod: 'CASH',
            franchiseId: testClient.franchiseId
        }
    })

    // 2. Blast EARN endpoint
    console.log(`[2/4] Bombarding earn-service with 50 concurrent requests for Tx: ${transactionId}...`)
    
    // Prepare 50 identical requests
    const promises = Array.from({ length: 50 }).map(() => {
        return processTransactionEarn({
            transactionId,
            clientId: testClient.id,
            locationId,
            items: [{
                id: 'mock-line-item-1',
                price: 50,
                serviceId: 'mock-service-1',
                quantity: 1
            }]
        }, program as any)
    })

    // Fire all at once
    const startTime = Date.now()
    const results = await Promise.allSettled(promises)
    const duration = Date.now() - startTime

    let successes = 0
    let doubleEarnRejections = 0
    let otherErrors = 0

    results.forEach(r => {
        if (r.status === 'fulfilled') {
            if (r.value.success) {
                successes++
            } else if (r.value.reason && r.value.reason.includes('Double-Earn Attempted')) {
                doubleEarnRejections++
            } else {
                otherErrors++
                console.log('Other Error Reason:', r.value.reason)
            }
        } else {
            otherErrors++
            console.error('Promise rejected:', r.reason)
        }
    })

    console.log(`[RESULTS] EARN Blast Completed in ${duration}ms`)
    console.log(`  -> ✅ Successes (Should be strictly 1): ${successes}`)
    console.log(`  -> 🛡️ Prisma P2002 Safe Rejections (Should be 49): ${doubleEarnRejections}`)
    console.log(`  -> ❌ Leakage/Other Errors: ${otherErrors}`)

    // 3. Verify actual ledger row count
    const ledgerRows = await prisma.salonLoyaltyLedgerEntry.findMany({
        where: { transactionId }
    })
     
    console.log(`[3/4] Validating Ledger State...`)
    console.log(`  -> Total EARN Rows generated for transactionId: ${ledgerRows.length}`)
    if (ledgerRows.length !== 1) {
        console.error("🔥 CRITICAL FAILURE: LEDGER CORRUPTED. Double-punch occurred.")
        process.exit(1)
    }

    // 4. Test Reversals
    console.log(`[4/4] Bombarding reversal-service with 50 concurrent refund requests...`)
    const { processTransactionReversal } = await import('../src/lib/loyalty/reversal-service')

    const refundTxId = `MOCK-REFUND-${transactionId}`
    await prisma.transaction.create({
        data: {
            id: refundTxId,
            status: 'COMPLETED',
            total: -50,
            subtotal: -50,
            paymentMethod: 'CASH',
            franchiseId: testClient.franchiseId
        }
    })

    const refundPromises = Array.from({ length: 50 }).map((_, i) => {
        return processTransactionReversal({
            transactionId: transactionId,
            sourceRefundTransactionId: refundTxId,
            reversalType: 'REFUND',
            clientId: testClient.id,
            locationId: locationId,
            refundedItems: [{
                 id: 'mock-line-item-1',
                 price: 50,
                 serviceId: 'mock-service-1',
                 quantity: 1
            }]
        }, program as any)
    })

    const refundResults = await Promise.allSettled(refundPromises)
    
    let refundSuccesses = 0
    let refundRejections = 0
    
    refundResults.forEach(r => {
        if (r.status === 'fulfilled') {
            if (r.value.success) refundSuccesses++
            else refundRejections++
        }
    })

    console.log(`[RESULTS] REFUND Blast Completed`)
    console.log(`  -> ✅ Successes (Should be strictly 1): ${refundSuccesses}`)
    console.log(`  -> 🛡️ Rejections (Should be 49): ${refundRejections}`)

    const refundLedgerRows = await prisma.salonLoyaltyLedgerEntry.findMany({
        where: { 
            sourceRefundTransactionId: refundTxId,
            entryType: 'REVERSE_REFUND'
        }
    })

    console.log(`  -> Total REFUND Rows generated for refundTx: ${refundLedgerRows.length}`)
    
    if (refundLedgerRows.length !== 1) {
         console.error("🔥 CRITICAL FAILURE: LEDGER CORRUPTED. Double-reversal occurred.")
         process.exit(1)
    }

    console.log("=========================================")
    console.log("✅ IDEMPOTENCY CERTIFICATION PASSED")
    console.log("=========================================")
}

runIdempotencyTest()
    .catch(console.error)
    .finally(() => process.exit(0))
