/**
 * Compliance Report API
 *
 * GET — Audit trail and compliance metrics from AuditLog model
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)
        const franchiseId = user.franchiseId

        const [auditLogs, totalCount] = await Promise.all([
            prisma.auditLog.findMany({
                where: { franchiseId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' },
                take: 100
            }),
            prisma.auditLog.count({
                where: { franchiseId, createdAt: { gte: since } }
            })
        ])

        // Action breakdown
        const actionBreakdown: Record<string, number> = {}
        const entityBreakdown: Record<string, number> = {}
        const statusBreakdown: Record<string, number> = {}
        const userActivity: Record<string, { email: string; count: number; actions: string[] }> = {}

        auditLogs.forEach(log => {
            actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1
            entityBreakdown[log.entityType] = (entityBreakdown[log.entityType] || 0) + 1
            statusBreakdown[log.status] = (statusBreakdown[log.status] || 0) + 1

            if (!userActivity[log.userId]) {
                userActivity[log.userId] = { email: log.userEmail || 'Unknown', count: 0, actions: [] }
            }
            userActivity[log.userId].count++
            if (!userActivity[log.userId].actions.includes(log.action)) {
                userActivity[log.userId].actions.push(log.action)
            }
        })

        // High-risk actions
        const highRiskActions = ['VOID', 'REFUND', 'DISCOUNT_OVERRIDE', 'DELETED', 'MANAGER_OVERRIDE']
        const highRiskCount = auditLogs.filter(l => highRiskActions.includes(l.action)).length
        const failedCount = auditLogs.filter(l => l.status === 'FAILURE' || l.status === 'BLOCKED').length

        return NextResponse.json({
            summary: {
                totalEvents: totalCount,
                highRiskEvents: highRiskCount,
                failedEvents: failedCount,
                uniqueUsers: Object.keys(userActivity).length,
                complianceScore: totalCount > 0
                    ? Math.max(0, 100 - Math.round((highRiskCount / totalCount) * 100) - Math.round((failedCount / totalCount) * 50))
                    : 100
            },
            actionBreakdown: Object.entries(actionBreakdown)
                .map(([action, count]) => ({ action, count }))
                .sort((a, b) => b.count - a.count),
            entityBreakdown: Object.entries(entityBreakdown)
                .map(([entity, count]) => ({ entity, count }))
                .sort((a, b) => b.count - a.count),
            userActivity: Object.entries(userActivity)
                .map(([userId, data]) => ({ userId, ...data }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 20),
            recentEvents: auditLogs.slice(0, 50).map(l => ({
                id: l.id,
                action: l.action,
                entityType: l.entityType,
                entityId: l.entityId,
                userEmail: l.userEmail,
                userRole: l.userRole,
                status: l.status,
                reason: l.reason,
                source: l.source,
                createdAt: l.createdAt
            })),
            periodDays: days
        })
    } catch (error) {
        console.error('[COMPLIANCE_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate compliance report' }, { status: 500 })
    }
}
