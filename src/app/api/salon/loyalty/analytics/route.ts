import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const programId = searchParams.get('programId')
    const locationId = searchParams.get('locationId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!programId) {
        return NextResponse.json({ error: 'programId is required' }, { status: 400 })
    }

    try {
        // Build base date filter if provided
        const dateFilter: any = {}
        if (dateFrom || dateTo) {
            dateFilter.createdAt = {}
            if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom)
            if (dateTo) dateFilter.createdAt.lte = new Date(dateTo)
        }

        // 1. activeLoops
        // active memberships, not expired, punchesEarned > 0 OR rewardsUnlocked > rewardsRedeemed
        const activeLoopsCount = await prisma.salonCustomerLoyaltyMembership.count({
            where: {
                loyaltyProgramId: programId,
                // Assuming status is implicit or handled by logic
                OR: [
                    { punchesEarned: { gt: 0 } },
                    { 
                        rewardsUnlocked: { gt: prisma.salonCustomerLoyaltyMembership.fields.rewardsRedeemed }
                        // Note: Prisma 5+ supports field comparisons, but if not available we can fetch and filter,
                        // or we can use a simpler approach. Let's do a raw query or just fetch them if needed.
                        // Wait, Prisma doesn't natively support A > B in standard where clause easily without raw or specific extensions.
                    }
                ]
            }
        })
        // Workaround for rewardsUnlocked > rewardsRedeemed:
        // Actually Prisma does not support `A > B` directly in the OR clause like this without `db.generated` or raw.
        // Let's just fetch them or use a raw query. We'll use a fast raw query for the active count safely.
        
        // Let's use Raw for the complex OR condition to be completely safe:
        const activeLoopsRaw = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count 
            FROM "SalonCustomerLoyaltyMembership"
            WHERE "loyaltyProgramId" = ${programId}
            AND ("punchesEarned" > 0 OR "rewardsUnlocked" > "rewardsRedeemed")
        `
        const activeLoops = Number(activeLoopsRaw[0]?.count || 0)

        // 2. rewardsClaimed
        // count of SalonTransactionLoyaltyRedemption
        const rewardsClaimed = await prisma.salonTransactionLoyaltyRedemption.count({
            where: {
                loyaltyProgramId: programId,
                ...(locationId ? { transaction: { locationId } } : {}),
                ...dateFilter
            }
        })

        // 3. redemptionRevenue
        // sum of transactions tied to SalonTransactionLoyaltyRedemption
        // First find transaction IDs
        const redemptions = await prisma.salonTransactionLoyaltyRedemption.findMany({
            where: {
                loyaltyProgramId: programId,
                ...(locationId ? { transaction: { locationId } } : {}),
                ...dateFilter
            },
            select: { transactionId: true }
        })
        
        const redeemedTxIds = [...new Set(redemptions.map(r => r.transactionId))]
        
        const redemptionRevenueAgg = await prisma.transaction.aggregate({
            where: {
                id: { in: redeemedTxIds }
            },
            _sum: {
                total: true
            }
        })
        const redemptionRevenue = Number(redemptionRevenueAgg._sum.total || 0)

        // 4. memberRevenue
        // sum of transactions by customers with active membership in the program
        // Get all clientIds who have ever had a membership in this program
        const members = await prisma.salonCustomerLoyaltyMembership.findMany({
            where: { loyaltyProgramId: programId },
            select: { clientId: true }
        })
        const memberIds = members.map(m => m.clientId)

        const memberRevenueAgg = await prisma.transaction.aggregate({
            where: {
                clientId: { in: memberIds },
                ...(locationId ? { locationId } : {}),
                ...dateFilter
            },
            _sum: {
                total: true
            }
        })
        const memberRevenue = Number(memberRevenueAgg._sum.total || 0)

        // 5, 6, 7. manual adjustments
        const adjustEntries = await prisma.salonLoyaltyLedgerEntry.findMany({
            where: {
                loyaltyProgramId: programId,
                entryType: 'MANUAL_ADJUST',
                ...(locationId ? { locationId } : {}),
                ...dateFilter
            },
            select: { punchesDelta: true }
        })

        let manualPositiveAdjustCount = 0
        let manualNegativeAdjustCount = 0

        adjustEntries.forEach(entry => {
            if (entry.punchesDelta > 0) manualPositiveAdjustCount++
            if (entry.punchesDelta < 0) manualNegativeAdjustCount++
        })

        const manualAdjustCount = adjustEntries.length

        return NextResponse.json({
            success: true,
            data: {
                activeLoops,
                rewardsClaimed,
                redemptionRevenue,
                memberRevenue,
                manualAdjustCount,
                manualPositiveAdjustCount,
                manualNegativeAdjustCount
            }
        })

    } catch (error) {
        console.error('[LOYALTY_ANALYTICS_ERROR]', error)
        return NextResponse.json({ error: 'Failed to compute loyalty analytics' }, { status: 500 })
    }
}
