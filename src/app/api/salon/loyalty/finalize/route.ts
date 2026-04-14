import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isFeatureEnabledForFranchise } from '@/lib/featureGate'
import { 
    LoyaltyEvaluationItem, 
    filterQualifyingItems, 
    calculatePotentialPunches 
} from '@/lib/loyalty/program-rules'
import { processTransactionEarn } from '@/lib/loyalty/earn-service'
import { processTransactionRedeem } from '@/lib/loyalty/redeem-service'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { transactionId, locationId, appliedRewards } = body

        if (!transactionId || !locationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Fetch Location and Franchise Context
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Invalid locationId' }, { status: 404 })
        }

        const isEnabled = await isFeatureEnabledForFranchise(location.franchiseId, 'usesSalonLoyalty')
        if (!isEnabled) {
            return NextResponse.json({ success: true, message: 'Loyalty disabled' }) // Safe no-op
        }

        // 2. Fetch the Source Transaction fully populated
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { lineItems: true }
        })

        // If the transaction isn't fully completed, DO NOT mutate loyalty points
        if (!transaction || transaction.status !== 'COMPLETED') {
            return NextResponse.json({ error: 'Transaction not found or not completed' }, { status: 400 })
        }
        
        // If no client is attached, bypass loyalty entirely without failing
        if (!transaction.clientId) {
            return NextResponse.json({ success: true, message: 'No client attached' })
        }

        // 3. Prepare the Atomic Data payload
        const clientId = transaction.clientId
        const stylistId = transaction.lineItems.length > 0 ? transaction.lineItems[0].barberId : undefined

        // Execute BOTH Redeem and Earn in a single sequential Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
            
            // REDEEM PHASE: Process explicit redemptions (un-spending available rewards)
            const redemptionsProcessed = await processTransactionRedeem(
                tx,
                transactionId,
                locationId,
                clientId,
                [...transaction.lineItems], // Clone to avoid mutation
                appliedRewards || []
            )

            // EARN PHASE: Iterate all active programs and compute EARN accumulation
            let totalEarnProcessed = 0
            const earningSummaries = []
            const activePrograms = await tx.salonLoyaltyProgram.findMany({
                where: {
                    status: 'ACTIVE',
                    OR: [
                        { appliesToSameLocationOnly: true, locationId },
                        { appliesToSameLocationOnly: false, franchiseId: location.franchiseId }
                    ]
                },
                include: { rules: true }
            })

            const evalItems: LoyaltyEvaluationItem[] = transaction.lineItems.map((item: any) => ({
                id: item.id,
                serviceId: item.serviceId, 
                categoryId: undefined, 
                price: Number(item.price), 
                quantity: item.quantity
            }))

            for (const program of activePrograms) {
                const qualifyingItems = filterQualifyingItems(evalItems, program.rules, program, locationId)
                
                if (qualifyingItems.length === 0) continue

                const earnedPunches = calculatePotentialPunches(qualifyingItems, program)

                if (earnedPunches > 0) {
                    const earnResult = await processTransactionEarn(
                        tx,
                        program,
                        clientId,
                        locationId,
                        transactionId,
                        earnedPunches,
                        stylistId || null
                    )
                    if (earnResult.success) {
                        earningSummaries.push({
                            programName: program.name,
                            ...earnResult
                        })
                    }
                    totalEarnProcessed++
                }
            }

            return { totalEarnProcessed, redemptionsProcessed, earningSummaries }
        })

        return NextResponse.json({ success: true, result })

    } catch (error: any) {
        console.error('[LOYALTY FINALIZE ERROR]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
