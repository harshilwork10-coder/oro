import { prisma } from '@/lib/prisma'
import { SalonCustomerLoyaltyMembership, SalonLoyaltyProgram } from '@prisma/client'

/**
 * Finds active memberships for a client.
 */
export async function getActiveMemberships(clientId: string) {
    return await prisma.salonCustomerLoyaltyMembership.findMany({
        where: { 
            clientId, 
            status: 'ACTIVE' 
        },
        include: {
            loyaltyProgram: {
                include: {
                    rules: true
                }
            }
        }
    })
}

/**
 * Ensures a membership exists (auto-enrolls if criteria met).
 * If autoEnroll is true, creates it if it doesn't exist.
 */
export async function ensureMembership(
    clientId: string,
    programId: string,
    locationId: string,
    autoEnrollAllowed: boolean
): Promise<SalonCustomerLoyaltyMembership | null> {
    
    let membership = await prisma.salonCustomerLoyaltyMembership.findUnique({
        where: {
            clientId_loyaltyProgramId: {
                clientId,
                loyaltyProgramId: programId
            }
        }
    })

    if (!membership && autoEnrollAllowed) {
        try {
            membership = await prisma.salonCustomerLoyaltyMembership.create({
                data: {
                    clientId,
                    loyaltyProgramId: programId,
                    homeLocationId: locationId,
                    status: 'ACTIVE'
                }
            })
        } catch (e: any) {
            // Concurrency race: Another request auto-enrolled them exactly now.
            if (e.code === 'P2002') {
                membership = await prisma.salonCustomerLoyaltyMembership.findUnique({
                    where: { clientId_loyaltyProgramId: { clientId, loyaltyProgramId: programId } }
                })
            } else {
                throw e
            }
        }
    }

    return membership
}

/**
 * Checks if the membership streak is still active based on Beauty Loop timing rules.
 * If expired, it zeroes out the progress in memory (it's the caller's job to save if necessary,
 * but for preview we just evaluate it dynamically).
 */
export function evaluateTimingWindow(
    membership: SalonCustomerLoyaltyMembership,
    program: SalonLoyaltyProgram,
    currentDate: Date = new Date()
): boolean {
    if (!program.timingWindowDays) return true // No timing rule = always active

    if (!membership.lastQualifiedVisitAt) return true // First visit ever
    
    if (membership.streakPreservedUntil && membership.streakPreservedUntil >= currentDate) {
        return true // Still within the safe window
    }

    // It has expired
    return false
}

/**
 * Gets the effective punch count, accounting for timing window expiry.
 */
export function getEffectivePunches(
    membership: SalonCustomerLoyaltyMembership,
    program: SalonLoyaltyProgram,
    currentDate: Date = new Date()
): number {
    const isActive = evaluateTimingWindow(membership, program, currentDate)
    if (!isActive) return 0 // Streak reset
    return membership.punchesEarned
}
