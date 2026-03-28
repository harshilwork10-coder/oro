/**
 * Employee Activity Audit Report API
 *
 * GET — Comprehensive employee behavior audit: price overrides, manual discounts,
 *       voids, no-sale drawer opens, refunds, suspended/incomplete invoices,
 *       line deletes, and more. Risk-scored per employee.
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '7')
        const employeeId = searchParams.get('employeeId')
        const eventType = searchParams.get('eventType')
        const severity = searchParams.get('severity')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
        const since = new Date(); since.setDate(since.getDate() - days)

        // ═══════════════════════════════════════
        //  1. AUDIT EVENTS (core risk tracking)
        // ═══════════════════════════════════════
        const auditWhere: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            createdAt: { gte: since }
        }
        if (employeeId) auditWhere.employeeId = employeeId
        if (eventType) auditWhere.eventType = eventType
        if (severity) auditWhere.severity = severity

        const [auditEvents, totalEvents] = await Promise.all([
            prisma.auditEvent.findMany({
                where: auditWhere,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.auditEvent.count({ where: auditWhere })
        ])

        // ═══════════════════════════════════════
        //  2. EMPLOYEE RISK SCORES
        // ═══════════════════════════════════════
        const allEvents = await prisma.auditEvent.findMany({
            where: { franchiseId: user.franchiseId, createdAt: { gte: since } },
            select: { employeeId: true, employeeName: true, eventType: true, severity: true, amount: true }
        })

        // Score weights: HIGH=10, MEDIUM=5, LOW=2
        const severityWeights: Record<string, number> = { HIGH: 10, MEDIUM: 5, LOW: 2 }
        const employeeScores: Record<string, {
            name: string; totalEvents: number; riskScore: number;
            voids: number; refunds: number; priceOverrides: number; manualDiscounts: number;
            noSales: number; lineDeletes: number; idOverrides: number; totalAmount: number;
            highSeverity: number; mediumSeverity: number
        }> = {}

        for (const ev of allEvents) {
            const eid = ev.employeeId || 'UNKNOWN'
            if (!employeeScores[eid]) {
                employeeScores[eid] = {
                    name: ev.employeeName || 'Unknown', totalEvents: 0, riskScore: 0,
                    voids: 0, refunds: 0, priceOverrides: 0, manualDiscounts: 0,
                    noSales: 0, lineDeletes: 0, idOverrides: 0, totalAmount: 0,
                    highSeverity: 0, mediumSeverity: 0
                }
            }
            const e = employeeScores[eid]
            e.totalEvents++
            e.riskScore += severityWeights[ev.severity] || 2
            e.totalAmount += Number(ev.amount || 0)
            if (ev.severity === 'HIGH') e.highSeverity++
            if (ev.severity === 'MEDIUM') e.mediumSeverity++

            switch (ev.eventType) {
                case 'VOID': e.voids++; break
                case 'REFUND': e.refunds++; break
                case 'PRICE_OVERRIDE': case 'PRICE_CHANGE': e.priceOverrides++; break
                case 'MANUAL_DISCOUNT': e.manualDiscounts++; break
                case 'NO_SALE': case 'DRAWER_OPEN': e.noSales++; break
                case 'LINE_DELETE': e.lineDeletes++; break
                case 'ID_OVERRIDE': e.idOverrides++; break
            }
        }

        // Sorted by risk score (highest first)
        const riskRanking = Object.entries(employeeScores)
            .map(([id, data]) => ({ employeeId: id, ...data, totalAmount: Math.round(data.totalAmount * 100) / 100 }))
            .sort((a, b) => b.riskScore - a.riskScore)

        // ═══════════════════════════════════════
        //  3. SUSPENDED / INCOMPLETE TRANSACTIONS
        // ═══════════════════════════════════════
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        const suspendedTx = await prisma.suspendedTransaction.findMany({
            where: {
                locationId: { in: locationIds },
                createdAt: { gte: since }
            },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true } },
                location: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        const suspendedList = suspendedTx.map(s => ({
            id: s.id,
            employee: `${s.employee.firstName || ''} ${s.employee.lastName || ''}`.trim(),
            employeeId: s.employee.id,
            location: s.location.name,
            label: s.label,
            status: s.status,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt
        }))

        // Suspended by employee count
        const suspendedByEmployee: Record<string, number> = {}
        for (const s of suspendedList) {
            suspendedByEmployee[s.employee] = (suspendedByEmployee[s.employee] || 0) + 1
        }

        // ═══════════════════════════════════════
        //  4. NO-SALE DRAWER OPENS
        // ═══════════════════════════════════════
        const noSaleOpens = await prisma.drawerActivity.count({
            where: {
                locationId: { in: locationIds },
                type: 'NO_SALE',
                timestamp: { gte: since }
            }
        })

        // ═══════════════════════════════════════
        //  5. VOIDED TRANSACTIONS
        // ═══════════════════════════════════════
        const voidedTransactions = await prisma.transaction.count({
            where: {
                franchiseId: user.franchiseId,
                status: 'VOIDED',
                createdAt: { gte: since }
            }
        })

        // ═══════════════════════════════════════
        //  6. EVENT TYPE SUMMARY
        // ═══════════════════════════════════════
        const eventTypeSummary = await prisma.auditEvent.groupBy({
            by: ['eventType'],
            where: { franchiseId: user.franchiseId, createdAt: { gte: since } },
            _count: { id: true },
            _sum: { amount: true }
        })

        const byEventType = eventTypeSummary.map(e => ({
            type: e.eventType,
            count: e._count.id,
            totalAmount: Math.round(Number(e._sum.amount || 0) * 100) / 100
        })).sort((a, b) => b.count - a.count)

        // ═══════════════════════════════════════
        //  7. UNREVIEWED HIGH-SEVERITY
        // ═══════════════════════════════════════
        const unreviewedHigh = await prisma.auditEvent.count({
            where: {
                franchiseId: user.franchiseId,
                severity: 'HIGH',
                reviewedAt: null,
                createdAt: { gte: since }
            }
        })

        // Format event log
        const eventLog = auditEvents.map(e => ({
            id: e.id,
            date: e.createdAt,
            employeeId: e.employeeId,
            employee: e.employeeName || 'Unknown',
            eventType: e.eventType,
            severity: e.severity,
            amount: e.amount ? Math.round(Number(e.amount) * 100) / 100 : null,
            details: e.details ? JSON.parse(e.details) : null,
            transactionId: e.transactionId,
            reviewed: !!e.reviewedAt,
            reviewedBy: e.reviewedByName,
            locationId: e.locationId
        }))

        return NextResponse.json({
            eventLog,
            employeeRiskRanking: riskRanking,
            byEventType,
            suspended: {
                total: suspendedList.length,
                active: suspendedList.filter(s => s.status === 'ACTIVE').length,
                voided: suspendedList.filter(s => s.status === 'VOIDED').length,
                expired: suspendedList.filter(s => s.status === 'EXPIRED').length,
                recent: suspendedList.slice(0, 10),
                byEmployee: suspendedByEmployee
            },
            summary: {
                totalAuditEvents: totalEvents,
                unreviewedHighSeverity: unreviewedHigh,
                noSaleOpens,
                voidedTransactions,
                topRiskEmployee: riskRanking[0] || null
            },
            pagination: { page, pages: Math.ceil(totalEvents / limit), total: totalEvents },
            periodDays: days
        })
    } catch (error) {
        console.error('[EMPLOYEE_AUDIT_GET]', error)
        return NextResponse.json({ error: 'Failed to generate employee audit report' }, { status: 500 })
    }
}
