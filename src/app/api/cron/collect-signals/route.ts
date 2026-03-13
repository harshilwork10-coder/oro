import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    generateJobRunId,
    buildDedupKey,
    getBusinessDate,
    COOLDOWN_HOURS,
} from '@/lib/owner-intelligence'
import type { OwnerSignalType, OwnerSignalEntityType } from '@prisma/client'

/**
 * Signal Collector Cron — POST /api/cron/collect-signals
 * 
 * Reads from existing modules (cash, LP, inventory, sales, compliance)
 * and writes normalized OwnerSignal rows.
 * 
 * Idempotent: uses jobRunId to skip duplicate runs.
 */
export async function POST() {
    const jobRunId = generateJobRunId('collect-signals')

    try {
        // Idempotency: skip if this hour's run already completed
        const existing = await prisma.ownerSignal.findFirst({
            where: { jobRunId },
        })
        if (existing) {
            return NextResponse.json({ skipped: true, jobRunId, reason: 'Already ran this hour' })
        }

        // Get all active franchises with locations
        const franchises = await prisma.franchise.findMany({
            select: {
                id: true,
                locations: { select: { id: true, name: true } },
            },
        })

        let signalsCreated = 0
        const bizDate = getBusinessDate()
        const signals: any[] = []

        for (const franchise of franchises) {
            for (const location of franchise.locations) {
                // ── Cash Variance ──
                const cashSignals = await collectCashSignals(franchise.id, location.id, bizDate)
                signals.push(...cashSignals)

                // ── Void/Refund Spikes ──
                const lpSignals = await collectLPSignals(franchise.id, location.id, bizDate)
                signals.push(...lpSignals)

                // ── Low Stock ──
                const stockSignals = await collectStockSignals(franchise.id, location.id, bizDate)
                signals.push(...stockSignals)
            }
        }

        // Apply cool-down: skip signals where a matching dedupKey already exists within cooldown window
        const filteredSignals: any[] = []
        for (const sig of signals) {
            const cooldownHrs = COOLDOWN_HOURS[sig.signalType as OwnerSignalType]
            if (cooldownHrs && sig.dedupKey) {
                const cutoff = new Date(Date.now() - cooldownHrs * 3600000)
                const recent = await prisma.ownerSignal.findFirst({
                    where: { dedupKey: sig.dedupKey, createdAt: { gte: cutoff } },
                })
                if (recent) continue // Suppress — within cooldown
            }
            filteredSignals.push(sig)
        }

        // Batch insert
        if (filteredSignals.length > 0) {
            const result = await prisma.ownerSignal.createMany({
                data: filteredSignals.map(s => ({ ...s, jobRunId })),
                skipDuplicates: true,
            })
            signalsCreated = result.count
        }

        return NextResponse.json({
            success: true,
            jobRunId,
            signalsCollected: signals.length,
            signalsSuppressed: signals.length - signalsCreated,
            signalsCreated,
        })
    } catch (error) {
        console.error('[COLLECT_SIGNALS]', error)
        return NextResponse.json({ error: 'Signal collection failed', jobRunId }, { status: 500 })
    }
}

// ═══════════════════════════════════════════════════════════════
// Signal Collectors (one function per module)
// ═══════════════════════════════════════════════════════════════

async function collectCashSignals(franchiseId: string, locationId: string, bizDate: Date) {
    const signals: any[] = []

    // Find recent cash drawer sessions with variance
    const recentSessions = await prisma.cashDrawerSession.findMany({
        where: {
            locationId,
            status: 'CLOSED',
            closedAt: { gte: new Date(Date.now() - 24 * 3600000) },
        },
        select: {
            id: true,
            expectedCash: true,
            actualCash: true,
            variance: true,
        },
    })

    for (const session of recentSessions) {
        const variance = Math.abs(Number(session.variance || 0))
        if (variance > 25) { // $25 threshold
            signals.push({
                franchiseId,
                locationId,
                signalType: 'CASH_VARIANCE' as OwnerSignalType,
                entityType: 'DRAWER' as OwnerSignalEntityType,
                entityId: session.id,
                signalDate: bizDate,
                payload: {
                    expectedCash: Number(session.expectedCash),
                    actualCash: Number(session.actualCash),
                    variance: Number(session.variance),
                },
                scoreInputs: {
                    financialImpact: variance,
                    urgencyScore: variance > 100 ? 80 : 50,
                    urgencyReason: `$${variance.toFixed(2)} cash variance`,
                    repeatCount: 1,
                    complianceRisk: 20,
                },
                dedupKey: buildDedupKey(locationId, 'CASH_VARIANCE', session.id, bizDate),
                processed: false,
            })
        }
    }

    return signals
}

async function collectLPSignals(franchiseId: string, locationId: string, bizDate: Date) {
    const signals: any[] = []
    const weekAgo = new Date(Date.now() - 7 * 86400000)

    // Count voids per employee in the last 7 days
    const voidsByEmployee = await prisma.transaction.groupBy({
        by: ['employeeId'],
        where: {
            locationId,
            type: 'VOID',
            createdAt: { gte: weekAgo },
            employeeId: { not: null },
        },
        _count: true,
    })

    // Calculate store average
    const totalVoids = voidsByEmployee.reduce((sum, v) => sum + v._count, 0)
    const avgVoids = voidsByEmployee.length > 0 ? totalVoids / voidsByEmployee.length : 0

    for (const emp of voidsByEmployee) {
        if (emp._count > avgVoids * 3 && emp._count >= 5 && emp.employeeId) {
            signals.push({
                franchiseId,
                locationId,
                signalType: 'VOID_SPIKE' as OwnerSignalType,
                entityType: 'USER' as OwnerSignalEntityType,
                entityId: emp.employeeId,
                signalDate: bizDate,
                payload: { voidCount: emp._count, storeAverage: avgVoids },
                scoreInputs: {
                    financialImpact: emp._count * 15, // rough estimate per void
                    urgencyScore: 50,
                    urgencyReason: `${emp._count} voids, ${(emp._count / avgVoids).toFixed(1)}x store average`,
                    repeatCount: 1,
                    complianceRisk: 30,
                },
                dedupKey: buildDedupKey(locationId, 'VOID_SPIKE', emp.employeeId, bizDate),
                processed: false,
            })
        }
    }

    // Same pattern for refunds
    const refundsByEmployee = await prisma.transaction.groupBy({
        by: ['employeeId'],
        where: {
            locationId,
            type: 'REFUND',
            createdAt: { gte: weekAgo },
            employeeId: { not: null },
        },
        _count: true,
    })

    const totalRefunds = refundsByEmployee.reduce((sum, r) => sum + r._count, 0)
    const avgRefunds = refundsByEmployee.length > 0 ? totalRefunds / refundsByEmployee.length : 0

    for (const emp of refundsByEmployee) {
        if (emp._count > avgRefunds * 3 && emp._count >= 5 && emp.employeeId) {
            signals.push({
                franchiseId,
                locationId,
                signalType: 'REFUND_SPIKE' as OwnerSignalType,
                entityType: 'USER' as OwnerSignalEntityType,
                entityId: emp.employeeId,
                signalDate: bizDate,
                payload: { refundCount: emp._count, storeAverage: avgRefunds },
                scoreInputs: {
                    financialImpact: emp._count * 20,
                    urgencyScore: 40,
                    urgencyReason: `${emp._count} refunds, ${(emp._count / avgRefunds).toFixed(1)}x store average`,
                    repeatCount: 1,
                    complianceRisk: 20,
                },
                dedupKey: buildDedupKey(locationId, 'REFUND_SPIKE', emp.employeeId, bizDate),
                processed: false,
            })
        }
    }

    return signals
}

async function collectStockSignals(franchiseId: string, locationId: string, bizDate: Date) {
    const signals: any[] = []

    // Find products with critically low stock at this location
    const lowStockProducts = await prisma.product.findMany({
        where: {
            franchiseId,
            isActive: true,
            stock: { lte: 2 },
            reorderPoint: { gt: 0 },
        },
        select: { id: true, name: true, stock: true, reorderPoint: true },
        take: 20, // Cap to avoid signal flood
    })

    for (const product of lowStockProducts) {
        const stock = Number(product.stock || 0)
        if (stock <= 0) {
            signals.push({
                franchiseId,
                locationId,
                signalType: 'LOW_STOCK_CRITICAL' as OwnerSignalType,
                entityType: 'SKU' as OwnerSignalEntityType,
                entityId: product.id,
                signalDate: bizDate,
                payload: { productName: product.name, stock, reorderPoint: Number(product.reorderPoint) },
                scoreInputs: {
                    financialImpact: 30, // lost revenue estimate
                    urgencyScore: 60,
                    urgencyReason: `${product.name} out of stock`,
                    repeatCount: 1,
                    complianceRisk: 0,
                },
                dedupKey: buildDedupKey(locationId, 'LOW_STOCK_CRITICAL', product.id, bizDate),
                processed: false,
            })
        }
    }

    return signals
}
