import { prisma } from '@/lib/prisma'
import { SalonCustomerLoyaltyMembership, SalonLoyaltyProgram, SalonLoyaltyLedgerEntry } from '@prisma/client'
import { LoyaltyEvaluationItem, filterQualifyingItems, calculatePotentialPunches } from './program-rules'

export interface RefundedItem {
    transactionLineItemId: string
    serviceId?: string
    categoryId?: string
    price: number
    quantity: number
}

export interface ReversalPayload {
    transactionId: string
    sourceRefundTransactionId?: string // Required for partial idempotency
    reversalType: 'REFUND' | 'VOID'
    clientId: string
    locationId: string
    refundedItems: RefundedItem[] // Replaces the generic evaluation array with strict line correlations
}

export async function processTransactionReversal(
    payload: ReversalPayload,
    program: SalonLoyaltyProgram & { rules: any[] }
) {
    const { transactionId, sourceRefundTransactionId, reversalType, clientId, locationId, refundedItems } = payload

    // 1. Fetch Membership
    const membership = await prisma.salonCustomerLoyaltyMembership.findUnique({
        where: { clientId_loyaltyProgramId: { clientId, loyaltyProgramId: program.id } }
    })
    if (!membership) {
        return { success: false, reason: 'No membership found, nothing to reverse.' }
    }

    // 2. Fetch Original EARN ledger for this transaction
    const originalEarnEntry = await prisma.salonLoyaltyLedgerEntry.findFirst({
        where: {
            transactionId,
            membershipId: membership.id,
            loyaltyProgramId: program.id,
            entryType: 'EARN'
        }
    })

    // 3. Fetch Original REDEEM ledgers for this transaction
    const originalRedemptions = await prisma.salonTransactionLoyaltyRedemption.findMany({
        where: {
            transactionId,
            membershipId: membership.id,
            loyaltyProgramId: program.id
        }
    })

    // If no earn and no redemption associated, nothing to reverse.
    if (!originalEarnEntry && originalRedemptions.length === 0) {
        return { success: false, reason: 'No loyalty impact discovered on this transaction.' }
    }

    // Determine the entryType for the reversal row
    const reversalEntryType = reversalType === 'VOID' ? 'REVERSE_VOID' : 'REVERSE_REFUND'

    try {
        await prisma.$transaction(async (tx) => {
            let totalPunchesToReverse = 0
            let rewardsToRefundFromRedeem = 0 // Rewards they SPENT that we give back

            // A. Handling Earn Reversal
            if (originalEarnEntry) {
                if (reversalType === 'VOID' && !program.reverseOnVoid) {
                    totalPunchesToReverse = 0
                } else if (reversalType === 'REFUND' && !program.reverseOnRefund) {
                    totalPunchesToReverse = 0
                } else if (reversalType === 'VOID') {
                    // Absolute total reversal
                    totalPunchesToReverse = originalEarnEntry.punchesDelta
                } else {
                    // Refund partial or full logic with Line-Aware matching
                    // Explicitly cast to the engine's generic shape to check mathematical weight
                    const mappedEvalItems: LoyaltyEvaluationItem[] = refundedItems.map(ri => ({
                        id: ri.transactionLineItemId,
                        serviceId: ri.serviceId,
                        categoryId: ri.categoryId,
                        price: ri.price,
                        quantity: ri.quantity
                    }))
                    
                    const refundQualifying = filterQualifyingItems(mappedEvalItems, program.rules, program, locationId)
                    const punchValueOfRefund = calculatePotentialPunches(refundQualifying, program)
                    
                    totalPunchesToReverse = Math.min(punchValueOfRefund, originalEarnEntry.punchesDelta)
                }
            }

            // B. Handling Redeem Reversal (Line-Aware!)
            if (originalRedemptions.length > 0) {
                if (reversalType === 'VOID') {
                    // Absolute total return of rewards
                    rewardsToRefundFromRedeem = originalRedemptions.length
                } else {
                    // Partial refund. Only un-spend the reward if the EXACT line that the reward 
                    // was applied to is actually being refunded.
                    const refundedsLineIds = refundedItems.map(r => r.transactionLineItemId)
                    
                    for (const redemption of originalRedemptions) {
                        if (!redemption.transactionLineItemId || refundedsLineIds.includes(redemption.transactionLineItemId)) {
                            // The line comped by a reward is physically being refunded
                            rewardsToRefundFromRedeem += 1
                        }
                    }
                }
            }

            if (totalPunchesToReverse === 0 && rewardsToRefundFromRedeem === 0) {
                return // Nothing strictly shifts, safety exit from transaction
            }

            const localSourceRefundId = sourceRefundTransactionId || 'base'
            const idemKey = `${reversalEntryType}_${program.id}_${membership.id}_${transactionId}_${localSourceRefundId}`

            // C. Create the Unified Reversal Ledger Entry
            // Binds identically to idempotencyKey guaranteeing absolute mathematical uniqueness on Postgres
            // Catching stale duplicates natively, but permitting distinct sequential partial refunds perfectly.
            await tx.salonLoyaltyLedgerEntry.create({
                data: {
                    loyaltyProgramId: program.id,
                    membershipId: membership.id,
                    clientId: membership.clientId,
                    transactionId,
                    locationId,
                    idempotencyKey: idemKey,
                    sourceRefundTransactionId: sourceRefundTransactionId || null, 
                    entryType: reversalEntryType,
                    punchesDelta: -totalPunchesToReverse, 
                    rewardDelta: 0, 
                    notes: `Reversed ${totalPunchesToReverse} punches, refunded ${rewardsToRefundFromRedeem} rewards from ${reversalType}`
                }
            })

            // D. Mathematical Un-rolling of Progress and Unlocks
            const threshold = program.punchesRequired || 5
            
            let newPunches = membership.punchesEarned - totalPunchesToReverse
            let newUnlocks = membership.rewardsUnlocked
            let newRedeems = membership.rewardsRedeemed - rewardsToRefundFromRedeem

            // If we negative-out punches, it means we must steal back a reward unlock
            while (newPunches < 0) {
                newPunches += threshold
                newUnlocks -= 1
            }

            // Fallback safety (prevent negative locks if anomalous overriding occurred)
            if (newUnlocks < 0) newUnlocks = 0
            if (newRedeems < 0) newRedeems = 0

            // E. Modify the Membership
            await tx.salonCustomerLoyaltyMembership.update({
                where: { id: membership.id },
                data: {
                    punchesEarned: newPunches,
                    rewardsUnlocked: newUnlocks,
                    rewardsRedeemed: newRedeems
                }
            })
        })

        return { success: true, processed: true }

    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, reason: 'Duplicate Reversal Attempted. Reversal already safely processed.' }
        }
        throw error
    }
}
