import { prisma } from '@/lib/prisma'
import { SalonCustomerLoyaltyMembership, SalonLoyaltyProgram, SalonLoyaltyLedgerEntry } from '@prisma/client'
import { LoyaltyEvaluationItem, filterQualifyingItems, calculatePotentialPunches } from './program-rules'
import { ensureMembership, getEffectivePunches } from './membership-service'

export interface FinalizePayload {
    transactionId: string
    clientId: string
    locationId: string
    stylistId?: string
    items: LoyaltyEvaluationItem[] // Qualified paid items
}

export async function processTransactionEarn(
    payload: FinalizePayload,
    program: SalonLoyaltyProgram & { rules: any[] }
) {
    const { transactionId, clientId, locationId, stylistId, items } = payload

    // 1. Identify Qualifying Items
    const qualifyingItems = filterQualifyingItems(items, program.rules, program, locationId)
    const earnedPunches = calculatePotentialPunches(qualifyingItems, program)

    if (earnedPunches <= 0) {
        return { success: false, reason: 'No qualifying items' }
    }

    // 2. Locate or Enroll Member (now with autoEnroll safely toggled by program settings)
    const membership = await ensureMembership(clientId, program.id, locationId, program.autoEnroll)
    
    if (!membership) {
        return { success: false, reason: 'Membership not found or auto-enroll disabled' }
    }

    const currentEffectivePunches = getEffectivePunches(membership, program)
    const threshold = program.punchesRequired || 5
    const totalPunchesAfterEarn = currentEffectivePunches + earnedPunches

    // 3. Evaluate new rewards (Immediately at threshold)
    let rewardUnlockedCount = 0
    let remainingProgress = totalPunchesAfterEarn

    // If they cross the threshold, they get a reward and the counter resets
    if (totalPunchesAfterEarn >= threshold) {
        // Find how many times they crossed the threshold
        rewardUnlockedCount = Math.floor(totalPunchesAfterEarn / threshold)
        remainingProgress = totalPunchesAfterEarn % threshold
    }

    let rewardExpiresAt: Date | undefined = undefined
    if (rewardUnlockedCount > 0 && program.rewardExpiryDays) {
        rewardExpiresAt = new Date()
        rewardExpiresAt.setDate(rewardExpiresAt.getDate() + program.rewardExpiryDays)
    }

    let streakPreservedUntil: Date | undefined = undefined
    if (program.timingWindowDays) {
        streakPreservedUntil = new Date()
        streakPreservedUntil.setDate(streakPreservedUntil.getDate() + program.timingWindowDays)
    }

    // 4. Perform the transactional DB logic
    // NOTE: This uses Prisma transaction to ensure the membership mutations happen in sync
    // with the Ledger injection.
    
    try {
        await prisma.$transaction(async (tx) => {
            // A. Create the Ledger Entry
            // Due to the @@unique([transactionId, loyaltyProgramId, membershipId, entryType]) constraint,
            // if this transaction was already processed for EARN, it will throw a Prisma error.
            await tx.salonLoyaltyLedgerEntry.create({
                data: {
                    loyaltyProgramId: program.id,
                    membershipId: membership.id,
                    clientId: membership.clientId,
                    transactionId,
                    locationId,
                    stylistId,
                    entryType: 'EARN',
                    idempotencyKey: `EARN_${program.id}_${membership.id}_${transactionId}_base`,
                    punchesDelta: earnedPunches,
                    rewardDelta: rewardUnlockedCount,
                }
            })

            // B. Update the Membership Aggregates
            await tx.salonCustomerLoyaltyMembership.update({
                where: { id: membership.id },
                data: {
                    punchesEarned: remainingProgress, // Hard reset logic per User Rule
                    rewardsUnlocked: membership.rewardsUnlocked + rewardUnlockedCount,
                    lastQualifiedVisitAt: new Date(),
                    streakPreservedUntil: streakPreservedUntil || membership.streakPreservedUntil,
                    rewardExpiresAt: rewardExpiresAt || membership.rewardExpiresAt
                }
            })
        })

        return {
            success: true,
            punchesEarned: earnedPunches,
            rewardsUnlocked: rewardUnlockedCount,
            newProgress: remainingProgress,
            streakPreservedUntil
        }
    } catch (error: any) {
        // Check if error is Prisma Unique Constraint Violation (P2002)
        if (error.code === 'P2002') {
            return { success: false, reason: 'Double-Earn Attempted. Transaction already finalized for this program.' }
        }
        throw error
    }
}
