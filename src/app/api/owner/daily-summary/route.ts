import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/daily-summary — Daily telemetry + reconciliation + issue summary
 *
 * Single endpoint that aggregates all daily pilot metrics into one response.
 * Owner/Manager only.
 *
 * Query: ?date=2026-03-27 (defaults to today)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const dateStr = searchParams.get('date')
        const now = new Date()
        const dayStart = dateStr ? new Date(dateStr + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

        // === TRANSACTIONS ===
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: dayStart, lt: dayEnd },
            },
            select: { status: true, total: true, paymentMethod: true, tax: true },
        })

        const txSummary = {
            total: transactions.length,
            completed: transactions.filter(t => t.status === 'COMPLETED').length,
            voided: transactions.filter(t => t.status === 'VOIDED').length,
            refunded: transactions.filter(t => t.status === 'REFUNDED').length,
            pending: transactions.filter(t => ['PENDING', 'IN_PROGRESS', 'SUSPENDED'].includes(t.status)).length,
            revenue: transactions.filter(t => t.status === 'COMPLETED').reduce((s, t) => s + Number(t.total), 0),
            taxCollected: transactions.filter(t => t.status === 'COMPLETED').reduce((s, t) => s + Number(t.tax), 0),
            voidRate: transactions.length > 0
                ? Math.round((transactions.filter(t => t.status === 'VOIDED').length / transactions.length) * 100 * 10) / 10
                : 0,
        }

        // Payment breakdown
        const paymentBreakdown: Record<string, { count: number; total: number }> = {}
        for (const t of transactions.filter(t => t.status === 'COMPLETED')) {
            const method = t.paymentMethod || 'UNKNOWN'
            if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 }
            paymentBreakdown[method].count++
            paymentBreakdown[method].total += Number(t.total)
        }

        // === TELEMETRY EVENTS ===
        const telemetryEvents = await prisma.auditLog.findMany({
            where: {
                action: { startsWith: 'TELEMETRY_' },
                createdAt: { gte: dayStart, lt: dayEnd },
                changes: { contains: user.franchiseId },
            },
            select: { action: true, status: true, changes: true },
        })

        const telemetrySummary: Record<string, { total: number; success: number; failure: number }> = {}
        for (const evt of telemetryEvents) {
            const name = evt.action.replace('TELEMETRY_', '')
            if (!telemetrySummary[name]) telemetrySummary[name] = { total: 0, success: 0, failure: 0 }
            telemetrySummary[name].total++
            if (evt.status === 'SUCCESS') telemetrySummary[name].success++
            else telemetrySummary[name].failure++
        }

        // === STATION HEALTH SNAPSHOT ===
        const stations = await prisma.station.findMany({
            where: { location: { franchiseId: user.franchiseId }, isActive: true },
            select: { id: true, name: true, lastHeartbeatAt: true, pairingStatus: true, trainingMode: true },
        })
        const STALE_MS = 10 * 60 * 1000
        const stationHealth = {
            total: stations.length,
            online: stations.filter(s => s.lastHeartbeatAt && (now.getTime() - new Date(s.lastHeartbeatAt).getTime()) < STALE_MS).length,
            stale: stations.filter(s => {
                if (!s.lastHeartbeatAt || s.pairingStatus === 'UNPAIRED') return false
                const age = now.getTime() - new Date(s.lastHeartbeatAt).getTime()
                return age >= STALE_MS && age < 24 * 60 * 60 * 1000
            }).length,
            offline: stations.filter(s => {
                if (s.pairingStatus === 'UNPAIRED') return false
                if (!s.lastHeartbeatAt) return true
                return now.getTime() - new Date(s.lastHeartbeatAt).getTime() >= 24 * 60 * 60 * 1000
            }).length,
            trainingMode: stations.filter(s => s.trainingMode).length,
        }

        // === PILOT ISSUES ===
        const pilotIssues = await prisma.auditLog.count({
            where: {
                action: { startsWith: 'PILOT_ISSUE' },
                changes: { contains: user.franchiseId },
                createdAt: { gte: dayStart, lt: dayEnd },
            },
        })

        // === RECONCILIATION FLAGS ===
        const reconFlags: string[] = []
        if (txSummary.pending > 0) reconFlags.push(`${txSummary.pending} stuck transaction(s) — resolve before close`)
        if (txSummary.voidRate > 5) reconFlags.push(`Void rate ${txSummary.voidRate}% exceeds 5% threshold`)
        if (stationHealth.offline > 0) reconFlags.push(`${stationHealth.offline} station(s) offline — verify hardware`)
        if (stationHealth.trainingMode > 0) reconFlags.push(`${stationHealth.trainingMode} station(s) in training mode — sales not recording`)

        return NextResponse.json({
            date: dayStart.toISOString().split('T')[0],
            transactions: txSummary,
            paymentBreakdown,
            telemetry: telemetrySummary,
            stationHealth,
            pilotIssuesCount: pilotIssues,
            reconciliationFlags: reconFlags,
            overallHealth: reconFlags.length === 0 && txSummary.pending === 0 && stationHealth.offline === 0
                ? 'GREEN' : reconFlags.length > 2 ? 'RED' : 'YELLOW',
        })
    } catch (error: any) {
        console.error('[DAILY_SUMMARY]', error)
        return NextResponse.json({ error: 'Failed to generate daily summary' }, { status: 500 })
    }
}
