import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/loyalty/alerts
 * 
 * Generates real-time loyalty operational alerts:
 * - Unusual manual adjustments (large or frequent)
 * - High excluded amount ratio
 * - Suspicious activity (rapid earn/redeem cycles)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const franchiseId = user.franchiseId
        const now = new Date()
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const alerts: Array<{
            id: string; severity: 'INFO' | 'WARNING' | 'CRITICAL'
            title: string; detail: string; category: string; timestamp: Date
        }> = []

        // ── 1. Unusual manual adjustments ──
        const recentAdjustments = await prisma.pointsTransaction.findMany({
            where: { franchiseId, type: 'ADJUST', createdAt: { gte: sevenDaysAgo } },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { member: { select: { phone: true, name: true } } }
        })

        // Large single adjustment (> 500 pts)
        for (const adj of recentAdjustments) {
            if (Math.abs(adj.points) >= 500) {
                alerts.push({
                    id: `large-adjust-${adj.id}`,
                    severity: Math.abs(adj.points) >= 1000 ? 'CRITICAL' : 'WARNING',
                    title: `Large adjustment: ${adj.points > 0 ? '+' : ''}${adj.points} pts`,
                    detail: `${adj.member?.name || adj.member?.phone || 'Unknown'} — ${adj.description || 'No reason'}`,
                    category: 'ADJUSTMENT',
                    timestamp: adj.createdAt
                })
            }
        }

        // Frequent adjustments (> 3 in 24h)
        const todayAdjustments = recentAdjustments.filter(a => a.createdAt >= today)
        if (todayAdjustments.length >= 3) {
            alerts.push({
                id: `freq-adjust-today`,
                severity: todayAdjustments.length >= 5 ? 'CRITICAL' : 'WARNING',
                title: `${todayAdjustments.length} manual adjustments today`,
                detail: `Higher than typical volume. Review for potential misuse.`,
                category: 'ADJUSTMENT',
                timestamp: now
            })
        }

        // ── 2. High excluded amount ──
        const earnTxToday = await prisma.pointsTransaction.findMany({
            where: { franchiseId, type: 'EARN', createdAt: { gte: today } },
            select: { metadata: true }
        })

        let totalEligible = 0, totalExcluded = 0
        for (const tx of earnTxToday) {
            if (tx.metadata) {
                try {
                    const m = JSON.parse(tx.metadata)
                    totalEligible += m.eligibleTotal || 0
                    totalExcluded += m.excludedTotal || 0
                } catch { /* skip */ }
            }
        }

        const totalSpend = totalEligible + totalExcluded
        if (totalSpend > 0) {
            const excludedRatio = totalExcluded / totalSpend
            if (excludedRatio > 0.5 && totalExcluded > 50) {
                alerts.push({
                    id: `high-excluded-today`,
                    severity: excludedRatio > 0.7 ? 'WARNING' : 'INFO',
                    title: `${Math.round(excludedRatio * 100)}% of spend excluded from loyalty`,
                    detail: `$${totalExcluded.toFixed(2)} excluded vs $${totalEligible.toFixed(2)} eligible today. Check if exclusion rules are too aggressive.`,
                    category: 'EXCLUSION',
                    timestamp: now
                })
            }
        }

        // ── 3. Suspicious rapid earn/redeem cycles ──
        const recentRedeems = await prisma.pointsTransaction.findMany({
            where: { franchiseId, type: 'REDEEM', createdAt: { gte: today } },
            select: { memberId: true, points: true, createdAt: true }
        })

        // Group redeems by member
        const redeemsByMember: Record<string, number> = {}
        for (const r of recentRedeems) {
            if (r.memberId) {
                redeemsByMember[r.memberId] = (redeemsByMember[r.memberId] || 0) + 1
            }
        }

        for (const [mId, count] of Object.entries(redeemsByMember)) {
            if (count >= 3) {
                const member = await prisma.loyaltyMember.findUnique({
                    where: { id: mId }, select: { phone: true, name: true }
                })
                alerts.push({
                    id: `rapid-redeem-${mId}`,
                    severity: count >= 5 ? 'CRITICAL' : 'WARNING',
                    title: `${count} redemptions today by one member`,
                    detail: `${member?.name || member?.phone || mId} — unusual redemption frequency`,
                    category: 'SUSPICIOUS',
                    timestamp: now
                })
            }
        }

        // Sort: critical first, then warning, then info
        const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 }
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

        return NextResponse.json({
            alerts,
            counts: {
                critical: alerts.filter(a => a.severity === 'CRITICAL').length,
                warning: alerts.filter(a => a.severity === 'WARNING').length,
                info: alerts.filter(a => a.severity === 'INFO').length,
                total: alerts.length
            }
        })
    } catch (error) {
        console.error('[LOYALTY_ALERTS]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
