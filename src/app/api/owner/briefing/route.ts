import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    getOwnerContext,
    hoursSince,
    generateActionText,
    getRecommendationScope,
} from '@/lib/owner-intelligence'

/**
 * Morning Briefing API — GET /api/owner/briefing
 * 
 * Returns: top 5 issues, store health scores, recommendations, yesterday's sales.
 * This is the single endpoint that powers both the command center and mobile brief.
 */
export async function GET() {
    try {
        const ctx = await getOwnerContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { franchiseId } = ctx

        // 1. Top issues (ranked by priority score, active only)
        const activeStatuses = ['OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'ESCALATED', 'REOPENED']
        const topIssues = await prisma.ownerIssue.findMany({
            where: {
                franchiseId,
                status: { in: activeStatuses },
                isActiveSignal: true,
            },
            orderBy: { priorityScore: 'desc' },
            take: 10,
            include: { location: { select: { id: true, name: true } } },
        })

        // 2. Store health scores (latest)
        const locations = await prisma.location.findMany({
            where: { franchiseId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        })

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const healthScores = await prisma.storeHealthScore.findMany({
            where: {
                franchiseId,
                date: { gte: new Date(today.getTime() - 2 * 86400000) }, // Last 2 days
            },
            orderBy: { date: 'desc' },
        })

        // Build per-location health (use most recent available)
        const storeHealth = locations.map(loc => {
            const score = healthScores.find(h => h.locationId === loc.id)
            return {
                locationId: loc.id,
                locationName: loc.name,
                overallScore: score?.overallScore ?? 50,
                overallStatus: score?.overallStatus ?? 'GREEN',
                salesHealth: score?.salesHealth ?? 50,
                cashHealth: score?.cashHealth ?? 50,
                laborHealth: score?.laborHealth ?? 50,
                inventoryHealth: score?.inventoryHealth ?? 50,
                complianceHealth: score?.complianceHealth ?? 50,
                lpHealth: score?.lpHealth ?? 50,
            }
        })

        // 3. Recommendations (aggregate issues by store for VISIT recs)
        const byStore: Record<string, typeof topIssues> = {}
        for (const issue of topIssues) {
            const locId = issue.locationId
            if (!byStore[locId]) byStore[locId] = []
            byStore[locId].push(issue)
        }

        const recommendations: any[] = []

        // Store visit recommendation
        const storeRanking = Object.entries(byStore)
            .map(([locId, issues]) => ({
                locationId: locId,
                locationName: issues[0]?.location?.name || 'Unknown',
                issueCount: issues.length,
                maxPriority: Math.max(...issues.map(i => i.priorityScore)),
                totalFinancial: issues.reduce((sum, i) => sum + i.financialImpact, 0),
                visitScore: issues.length * 10 + Math.max(...issues.map(i => i.priorityScore)),
                issueIds: issues.map(i => i.id),
            }))
            .sort((a, b) => b.visitScore - a.visitScore)

        if (storeRanking[0] && storeRanking[0].issueCount >= 2) {
            recommendations.push({
                rank: 1,
                action: `Visit ${storeRanking[0].locationName}`,
                actionType: 'VISIT_STORE',
                ownerScope: 'OWNER',
                reason: `${storeRanking[0].issueCount} open issues, $${storeRanking[0].totalFinancial.toFixed(0)} at risk`,
                issueIds: storeRanking[0].issueIds,
            })
        }

        // Individual issue recommendations
        for (const issue of topIssues.slice(0, 5)) {
            if (recommendations.some(r => r.issueIds?.includes(issue.id))) continue
            recommendations.push({
                rank: recommendations.length + 1,
                action: issue.recommended || generateActionText(issue.issueType, issue.location?.name || ''),
                actionType: issue.issueType,
                ownerScope: getRecommendationScope(issue.issueType),
                reason: issue.reasoning || issue.summary,
                issueIds: [issue.id],
            })
            if (recommendations.length >= 5) break
        }

        // 4. Issue counts by status
        const [openCount, escalatedCount, totalActive] = await Promise.all([
            prisma.ownerIssue.count({ where: { franchiseId, status: 'OPEN' } }),
            prisma.ownerIssue.count({ where: { franchiseId, status: 'ESCALATED' } }),
            prisma.ownerIssue.count({ where: { franchiseId, status: { in: activeStatuses } } }),
        ])

        // 5. Enrich top issues with computed ageHours
        const enrichedIssues = topIssues.map(issue => ({
            id: issue.id,
            title: issue.title,
            summary: issue.summary,
            severity: issue.severity,
            status: issue.status,
            issueType: issue.issueType,
            category: issue.category,
            priorityScore: issue.priorityScore,
            financialImpact: issue.financialImpact,
            reasoning: issue.reasoning,
            recommended: issue.recommended || generateActionText(issue.issueType, issue.location?.name || ''),
            ageHours: Math.round(hoursSince(issue.firstSeenAt) * 10) / 10,
            repeatCount: issue.repeatCount,
            locationId: issue.locationId,
            locationName: issue.location?.name,
            assignedToName: issue.assignedToName,
            dueAt: issue.dueAt,
            version: issue.version,
        }))

        return NextResponse.json({
            briefing: {
                topIssues: enrichedIssues,
                storeHealth,
                recommendations,
                counts: { open: openCount, escalated: escalatedCount, totalActive },
                todaysPriority: recommendations[0] || null,
            },
        })
    } catch (error) {
        console.error('[OWNER_BRIEFING]', error)
        return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
    }
}
