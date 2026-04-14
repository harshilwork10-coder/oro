import { PrismaClient } from '@prisma/client'
import { LoyaltyEvaluationItem, filterQualifyingItems } from './program-rules'

interface AppliedReward {
    programId: string
}

export async function processTransactionRedeem(
    tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
    transactionId: string,
    locationId: string,
    clientId: string,
    lineItems: any[], // The fully generated DB transaction line items matching Prisma
    appliedRewards: AppliedReward[]
) {
    if (!appliedRewards || appliedRewards.length === 0) return 0

    let successfulRedeems = 0

    for (const reward of appliedRewards) {
        const program = await tx.salonLoyaltyProgram.findUnique({
            where: { id: reward.programId },
            include: { rules: true }
        })

        if (!program) continue

        const membership = await tx.salonCustomerLoyaltyMembership.findUnique({
            where: {
                clientId_loyaltyProgramId: {
                    clientId,
                    loyaltyProgramId: program.id
                }
            }
        })

        if (!membership) continue

        const rewardsAvailable = membership.rewardsUnlocked - membership.rewardsRedeemed
        if (rewardsAvailable <= 0) continue

        // Map DB line items to evaluation interface
        const evalItems: LoyaltyEvaluationItem[] = lineItems.map(li => ({
            id: li.id,
            serviceId: li.serviceId,
            categoryId: undefined,
            price: Number(li.price),
            quantity: li.quantity
        }))

        // Look for the exact targeted qualifying item
        const qualifyingItems = filterQualifyingItems(evalItems, program.rules, program, locationId)
        
        if (qualifyingItems.length === 0) continue

        // Pick one line item logically to comp (e.g. highest price first or just first)
        const targetItem = qualifyingItems.sort((a, b) => b.price - a.price)[0]

        // Create REDEEM entry
        const redeemIdempotencyKey = `REDEEM_${program.id}_${membership.id}_${transactionId}_${targetItem.id}`

        try {
            await tx.salonLoyaltyLedgerEntry.create({
                data: {
                    loyaltyProgramId: program.id,
                    membershipId: membership.id,
                    clientId: membership.clientId,
                    transactionId,
                    locationId,
                    entryType: 'REDEEM',
                    idempotencyKey: redeemIdempotencyKey,
                    punchesDelta: 0,
                    rewardDelta: -1, // Subtracts from available reward pool
                    notes: `Redeemed reward on transaction ${transactionId}`,
                    transactionLineItemId: targetItem.id
                }
            })

            await tx.salonTransactionLoyaltyRedemption.create({
                data: {
                    transactionId,
                    loyaltyProgramId: program.id,
                    membershipId: membership.id,
                    appliedValue: targetItem.price,
                    transactionLineItemId: targetItem.id
                }
            })

            // Update Membership totals cleanly
            await tx.salonCustomerLoyaltyMembership.update({
                where: { id: membership.id },
                data: {
                    rewardsRedeemed: { increment: 1 }
                }
            })

            successfulRedeems++
            
            // Remove targetItem from available qualifying items for the next iteration (if multiple same rewards applied)
            const idx = lineItems.findIndex(li => li.id === targetItem.id)
            if (idx > -1) {
                lineItems.splice(idx, 1) // Ensures two rewards don't redeem against the exact same single quantity line
            }

        } catch (e: any) {
            if (e.code === 'P2002') {
                // Idempotency check securely blocked duplicate redeem
                console.log(`[Redeem Idempotent Skip] Reward already redeemed.`)
            } else {
                console.error(`[Redeem Error] Failed to write redeem log:`, e)
            }
        }
    }

    return successfulRedeems
}
