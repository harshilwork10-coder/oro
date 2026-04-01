import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/reports/loyalty-summary
 *
 * Owner-facing daily loyalty operational summary.
 * Uses structured metadata from PointsTransaction to provide:
 * - Points issued/redeemed today
 * - Excluded amounts (from metadata.excludedTotal)
 * - Top rule hits (from metadata.breakdown.ruleApplied)
 * - Top loyalty products/categories
 * - Active member count
 *
 * Query params:
 *   ?date=YYYY-MM-DD  (default: today)
 *   ?franchiseId=xxx  (default: user's franchise)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const dateParam = searchParams.get('date')
        let franchiseId = searchParams.get('franchiseId') || user.franchiseId

        // For franchisor users, allow querying any franchise
        if (user.role === 'FRANCHISOR' && !searchParams.get('franchiseId')) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        // Date range
        const startOfDay = dateParam ? new Date(dateParam) : new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay)
        endOfDay.setDate(endOfDay.getDate() + 1)

        // Points issued today (EARN)
        const earns = await prisma.pointsTransaction.aggregate({
            where: {
                franchiseId,
                type: 'EARN',
                createdAt: { gte: startOfDay, lt: endOfDay }
            },
            _sum: { points: true },
            _count: true
        })

        // Points redeemed today (REDEEM)
        const redeems = await prisma.pointsTransaction.aggregate({
            where: {
                franchiseId,
                type: 'REDEEM',
                createdAt: { gte: startOfDay, lt: endOfDay }
            },
            _sum: { points: true },
            _count: true
        })

        // Adjustments today
        const adjustments = await prisma.pointsTransaction.aggregate({
            where: {
                franchiseId,
                type: 'ADJUST',
                createdAt: { gte: startOfDay, lt: endOfDay }
            },
            _sum: { points: true },
            _count: true
        })

        // Fetch all EARN transactions with metadata for detailed analytics
        const earnTransactions = await prisma.pointsTransaction.findMany({
            where: {
                franchiseId,
                type: 'EARN',
                createdAt: { gte: startOfDay, lt: endOfDay }
            },
            select: {
                metadata: true,
                points: true,
                description: true
            }
        })

        // Parse metadata to extract rule hits, excluded amounts, and top products/categories
        let totalExcluded = 0
        let totalEligible = 0
        const ruleHitCounts: Record<string, { count: number; totalPoints: number }> = {}
        const productHits: Record<string, { count: number; totalPoints: number }> = {}
        const categoryHits: Record<string, { count: number; totalPoints: number; excluded: number }> = {}
        let smartRewardsTransactions = 0
        let flatRateTransactions = 0

        for (const tx of earnTransactions) {
            if (tx.metadata) {
                try {
                    const meta = JSON.parse(tx.metadata)
                    totalExcluded += meta.excludedTotal || 0
                    totalEligible += meta.eligibleTotal || 0

                    if (meta.smartRewardsActive) smartRewardsTransactions++
                    else flatRateTransactions++

                    // Breakdown analytics
                    if (meta.breakdown && Array.isArray(meta.breakdown)) {
                        for (const b of meta.breakdown) {
                            // Rule hit counting
                            const rule = b.ruleApplied || 'UNKNOWN'
                            if (!ruleHitCounts[rule]) ruleHitCounts[rule] = { count: 0, totalPoints: 0 }
                            ruleHitCounts[rule].count++
                            ruleHitCounts[rule].totalPoints += b.points || 0

                            // Product hits (only earning items)
                            if (!b.excluded && b.itemName) {
                                if (!productHits[b.itemName]) productHits[b.itemName] = { count: 0, totalPoints: 0 }
                                productHits[b.itemName].count++
                                productHits[b.itemName].totalPoints += b.points || 0
                            }

                            // Category extraction from rule name
                            const categoryMatch = rule.match(/CATEGORY:\s*(.+)/)
                            const catName = categoryMatch ? categoryMatch[1] : (b.excluded ? 'Excluded' : 'General')
                            if (!categoryHits[catName]) categoryHits[catName] = { count: 0, totalPoints: 0, excluded: 0 }
                            categoryHits[catName].count++
                            if (b.excluded) categoryHits[catName].excluded++
                            else categoryHits[catName].totalPoints += b.points || 0
                        }
                    }
                } catch { /* skip unparseable metadata */ }
            } else {
                flatRateTransactions++
            }
        }

        // Top rule hits (sorted by count)
        const topRuleHits = Object.entries(ruleHitCounts)
            .map(([rule, data]) => ({ rule, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        // Top earning products (sorted by total points)
        const topProducts = Object.entries(productHits)
            .map(([product, data]) => ({ product, ...data }))
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 10)

        // Category breakdown
        const categoryBreakdown = Object.entries(categoryHits)
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.totalPoints - a.totalPoints)

        // Also include legacy description-based grouping for backward compat
        const topDescriptions = await prisma.pointsTransaction.groupBy({
            by: ['description'],
            where: {
                franchiseId,
                type: 'EARN',
                createdAt: { gte: startOfDay, lt: endOfDay }
            },
            _count: true,
            _sum: { points: true },
            orderBy: { _count: { description: 'desc' } },
            take: 10
        })

        // Active member count (90 days)
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        let activeMemberCount = 0
        let totalOutstandingPoints = 0
        try {
            const program = await prisma.loyaltyProgram.findUnique({
                where: { franchiseId }
            })
            if (program) {
                activeMemberCount = await prisma.loyaltyMember.count({
                    where: {
                        programId: program.id,
                        lastActivity: { gte: ninetyDaysAgo }
                    }
                })

                const balanceAgg = await prisma.loyaltyMember.aggregate({
                    where: { programId: program.id },
                    _sum: { pointsBalance: true }
                })
                totalOutstandingPoints = balanceAgg._sum?.pointsBalance || 0
            }
        } catch { /* program may not exist */ }

        return NextResponse.json({
            date: startOfDay.toISOString().split('T')[0],
            franchiseId,

            pointsIssuedToday: {
                count: earns._count,
                total: earns._sum?.points || 0
            },

            pointsRedeemedToday: {
                count: redeems._count,
                total: Math.abs(redeems._sum?.points || 0)
            },

            adjustmentsToday: {
                count: adjustments._count,
                total: adjustments._sum?.points || 0
            },

            netPointsToday: (earns._sum?.points || 0) + (redeems._sum?.points || 0) + (adjustments._sum?.points || 0),

            // NEW: Metadata-based analytics
            excludedAmountToday: Math.round(totalExcluded * 100) / 100,
            eligibleAmountToday: Math.round(totalEligible * 100) / 100,

            topRuleHits,
            topProducts,
            categoryBreakdown,

            engineStats: {
                smartRewardsTransactions,
                flatRateTransactions,
                totalTransactions: earnTransactions.length
            },

            // Legacy compat
            topDescriptions: topDescriptions.map(d => ({
                description: d.description || 'Unknown',
                count: d._count,
                totalPoints: d._sum?.points || 0
            })),

            activeMemberCount,
            totalOutstandingPoints
        })
    } catch (error) {
        console.error('[LOYALTY_SUMMARY]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
