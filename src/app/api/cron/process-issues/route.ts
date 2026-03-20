import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    computePriorityScore,
    higherSeverity,
    SIGNAL_TO_CATEGORY,
    REOPEN_WINDOW_HOURS,
    ESCALATION_RULES,
    hoursSince,
    generateActionText,
    generateJobRunId,
    type ScoreInputs,
} from '@/lib/owner-intelligence'
import type { OwnerIssueSeverity, OwnerSignalType } from '@prisma/client'

/**
 * Issue Processor Cron — POST /api/cron/process-issues
 * 
 * Reads unprocessed OwnerSignals, applies dedup/reopen logic,
 * scores, and creates/updates OwnerIssues.
 * Also runs auto-escalation on stale issues.
 */
export async function POST() {
    const jobRunId = generateJobRunId('process-issues')

    try {
        // 1. Grab unprocessed signals (batch of 200)
        const signals = await prisma.ownerSignal.findMany({
            where: { processed: false },
            orderBy: { createdAt: 'asc' },
            take: 200,
        })

        if (signals.length === 0) {
            // Still run auto-escalation even with no new signals
            const escalated = await runAutoEscalation()
            const unsnoozed = await runUnsnooze()
            return NextResponse.json({
                success: true,
                jobRunId,
                processed: 0,
                created: 0,
                updated: 0,
                reopened: 0,
                escalated,
                unsnoozed,
            })
        }

        // Fetch owner notification preferences for weight overrides
        // Group by franchise to minimize queries
        const franchiseIds = [...new Set(signals.map(s => s.franchiseId))]
        const prefsMap = new Map<string, Record<string, number> | null>()

        for (const fid of franchiseIds) {
            const prefs = await prisma.ownerNotificationPreference.findFirst({
                where: { franchiseId: fid },
                select: { weightOverrides: true },
            })
            prefsMap.set(fid, prefs?.weightOverrides as Record<string, number> | null)
        }

        let created = 0, updated = 0, reopened = 0

        // 2. Process each signal
        for (const signal of signals) {
            const scoreInputs = (signal.scoreInputs as ScoreInputs) || {
                financialImpact: 0, urgencyScore: 30, repeatCount: 1, complianceRisk: 0,
            }
            const weightOverrides = prefsMap.get(signal.franchiseId) || null
            const { priorityScore, severity, reasoning } = computePriorityScore(
                signal.signalType,
                scoreInputs,
                weightOverrides,
            )

            const category = SIGNAL_TO_CATEGORY[signal.signalType]

            // 3. Dedup: check for existing issue with same key
            if (signal.dedupKey) {
                const existing = await prisma.ownerIssue.findFirst({
                    where: { dedupKey: signal.dedupKey, franchiseId: signal.franchiseId },
                    include: { location: { select: { name: true } } },
                })

                if (existing) {
                    if (existing.status !== 'RESOLVED') {
                        // UPDATE existing open issue
                        await prisma.ownerIssue.update({
                            where: { id: existing.id },
                            data: {
                                lastSeenAt: new Date(),
                                repeatCount: { increment: 1 },
                                priorityScore: Math.max(existing.priorityScore, priorityScore),
                                severity: higherSeverity(existing.severity as OwnerIssueSeverity, severity),
                                isActiveSignal: true,
                                version: { increment: 1 },
                            },
                        })
                        updated++
                    } else if (existing.resolvedAt && hoursSince(existing.resolvedAt) < REOPEN_WINDOW_HOURS) {
                        // REOPEN if resolved recently
                        await prisma.$transaction([
                            prisma.ownerIssue.update({
                                where: { id: existing.id },
                                data: {
                                    status: 'REOPENED',
                                    reopenedCount: { increment: 1 },
                                    lastSeenAt: new Date(),
                                    isActiveSignal: true,
                                    resolvedAt: null,
                                    workflowResolvedAt: null,
                                    sourceResolvedAt: null,
                                    version: { increment: 1 },
                                },
                            }),
                            prisma.ownerIssueEvent.create({
                                data: {
                                    ownerIssueId: existing.id,
                                    eventType: 'REOPENED',
                                    fromStatus: 'RESOLVED',
                                    toStatus: 'REOPENED',
                                    note: 'Signal recurred within 72h of resolution',
                                },
                            }),
                        ])
                        reopened++
                    } else {
                        // Resolved long ago — create new issue
                        await createNewIssue(signal, category, priorityScore, severity, reasoning)
                        created++
                    }

                    // Mark signal processed
                    await prisma.ownerSignal.update({
                        where: { id: signal.id },
                        data: { processed: true, processedAt: new Date() },
                    })
                    continue
                }
            }

            // No existing issue — create new
            await createNewIssue(signal, category, priorityScore, severity, reasoning)
            created++

            // Mark signal processed
            await prisma.ownerSignal.update({
                where: { id: signal.id },
                data: { processed: true, processedAt: new Date() },
            })
        }

        // 4. Run auto-escalation and un-snooze
        const escalated = await runAutoEscalation()
        const unsnoozed = await runUnsnooze()

        return NextResponse.json({
            success: true,
            jobRunId,
            processed: signals.length,
            created,
            updated,
            reopened,
            escalated,
            unsnoozed,
        })
    } catch (error) {
        console.error('[PROCESS_ISSUES]', error)
        return NextResponse.json({ error: 'Issue processing failed', jobRunId }, { status: 500 })
    }
}

// ═══════════════════════════════════════════════════════════════
// Helpers (private to this route — not shared since only cron uses them)
// ═══════════════════════════════════════════════════════════════

async function createNewIssue(
    signal: any,
    category: string,
    priorityScore: number,
    severity: string,
    reasoning: string,
) {
    const location = await prisma.location.findUnique({
        where: { id: signal.locationId },
        select: { name: true },
    })
    const locName = location?.name || 'Unknown'
    const payload = signal.payload as any || {}
    const scoreInputs = signal.scoreInputs as any || {}

    const title = buildIssueTitle(signal.signalType, locName, payload)
    const summary = buildIssueSummary(signal.signalType, locName, payload)

    const issue = await prisma.ownerIssue.create({
        data: {
            franchiseId: signal.franchiseId,
            locationId: signal.locationId,
            category: category as any,
            issueType: signal.signalType,
            severity: severity as any,
            dedupKey: signal.dedupKey,
            priorityScore,
            financialImpact: scoreInputs.financialImpact || 0,
            urgencyScore: scoreInputs.urgencyScore || 0,
            complianceRisk: scoreInputs.complianceRisk || 0,
            title,
            summary,
            details: payload,
            reasoning,
            recommended: generateActionText(signal.signalType as OwnerSignalType, locName),
            sourceType: 'OWNER_SIGNAL',
            sourceId: signal.id,
        },
    })

    // Create initial event
    await prisma.ownerIssueEvent.create({
        data: {
            ownerIssueId: issue.id,
            eventType: 'CREATED',
            toStatus: 'OPEN',
            note: reasoning,
        },
    })
}

function buildIssueTitle(signalType: string, locName: string, payload: any): string {
    switch (signalType) {
        case 'CASH_VARIANCE':
            return `Cash variance $${Math.abs(payload.variance || 0).toFixed(2)} at ${locName}`
        case 'DEPOSIT_OVERDUE':
            return `Deposit overdue at ${locName}`
        case 'VOID_SPIKE':
            return `Void spike detected at ${locName}`
        case 'REFUND_SPIKE':
            return `Refund spike detected at ${locName}`
        case 'LOW_STOCK_CRITICAL':
            return `${payload.productName || 'Product'} out of stock at ${locName}`
        case 'SALES_DROP':
            return `Sales drop at ${locName}`
        case 'ID_CHECK_MISSED':
            return `Missed ID check at ${locName}`
        case 'EMPLOYEE_RISK_HIGH':
            return `High-risk employee activity at ${locName}`
        case 'DEVICE_OFFLINE':
            return `Device offline at ${locName}`
        case 'TRANSFER_DISCREPANCY':
            return `Transfer discrepancy at ${locName}`
        default:
            return `Issue detected at ${locName}`
    }
}

function buildIssueSummary(signalType: string, locName: string, payload: any): string {
    switch (signalType) {
        case 'CASH_VARIANCE':
            return `${locName} cash drawer short $${Math.abs(payload.variance || 0).toFixed(2)} (expected $${(payload.expectedCash || 0).toFixed(2)}, counted $${(payload.actualCash || 0).toFixed(2)})`
        case 'VOID_SPIKE':
            return `Employee at ${locName} has ${payload.voidCount || 0} voids (${((payload.voidCount || 0) / (payload.storeAverage || 1)).toFixed(1)}x store average)`
        case 'REFUND_SPIKE':
            return `Employee at ${locName} has ${payload.refundCount || 0} refunds (${((payload.refundCount || 0) / (payload.storeAverage || 1)).toFixed(1)}x store average)`
        case 'LOW_STOCK_CRITICAL':
            return `${payload.productName || 'Product'} has ${payload.stock ?? 0} units at ${locName} (reorder point: ${payload.reorderPoint || 0})`
        default:
            return `${signalType.replace(/_/g, ' ').toLowerCase()} detected at ${locName}`
    }
}

async function runAutoEscalation(): Promise<number> {
    const now = new Date()
    let count = 0

    // CRITICAL open > 4 hours → escalate
    const criticalCutoff = new Date(now.getTime() - ESCALATION_RULES.CRITICAL_OPEN_HOURS * 3600000)
    const criticalIssues = await prisma.ownerIssue.findMany({
        where: {
            severity: 'CRITICAL',
            status: { in: ['OPEN', 'ACKNOWLEDGED'] },
            firstSeenAt: { lte: criticalCutoff },
        },
    })

    for (const issue of criticalIssues) {
        await prisma.$transaction([
            prisma.ownerIssue.update({
                where: { id: issue.id },
                data: { status: 'ESCALATED', escalatedAt: now, version: { increment: 1 } },
            }),
            prisma.ownerIssueEvent.create({
                data: {
                    ownerIssueId: issue.id,
                    eventType: 'ESCALATED',
                    fromStatus: issue.status,
                    toStatus: 'ESCALATED',
                    note: `Auto-escalated: CRITICAL issue open > ${ESCALATION_RULES.CRITICAL_OPEN_HOURS}h`,
                },
            }),
        ])
        count++
    }

    // HIGH open > 24 hours → escalate
    const highCutoff = new Date(now.getTime() - ESCALATION_RULES.HIGH_OPEN_HOURS * 3600000)
    const highIssues = await prisma.ownerIssue.findMany({
        where: {
            severity: 'HIGH',
            status: { in: ['OPEN', 'ACKNOWLEDGED'] },
            firstSeenAt: { lte: highCutoff },
        },
    })

    for (const issue of highIssues) {
        await prisma.$transaction([
            prisma.ownerIssue.update({
                where: { id: issue.id },
                data: { status: 'ESCALATED', escalatedAt: now, version: { increment: 1 } },
            }),
            prisma.ownerIssueEvent.create({
                data: {
                    ownerIssueId: issue.id,
                    eventType: 'ESCALATED',
                    fromStatus: issue.status,
                    toStatus: 'ESCALATED',
                    note: `Auto-escalated: HIGH issue open > ${ESCALATION_RULES.HIGH_OPEN_HOURS}h`,
                },
            }),
        ])
        count++
    }

    // ASSIGNED past dueAt → escalate
    const overdueAssigned = await prisma.ownerIssue.findMany({
        where: {
            status: 'ASSIGNED',
            dueAt: { lte: now },
        },
    })

    for (const issue of overdueAssigned) {
        await prisma.$transaction([
            prisma.ownerIssue.update({
                where: { id: issue.id },
                data: { status: 'ESCALATED', escalatedAt: now, version: { increment: 1 } },
            }),
            prisma.ownerIssueEvent.create({
                data: {
                    ownerIssueId: issue.id,
                    eventType: 'ESCALATED',
                    fromStatus: 'ASSIGNED',
                    toStatus: 'ESCALATED',
                    note: `Auto-escalated: past due date`,
                },
            }),
        ])
        count++
    }

    return count
}

async function runUnsnooze(): Promise<number> {
    const now = new Date()
    const snoozed = await prisma.ownerIssue.findMany({
        where: {
            status: 'SNOOZED',
            snoozedUntil: { lte: now },
        },
    })

    for (const issue of snoozed) {
        await prisma.$transaction([
            prisma.ownerIssue.update({
                where: { id: issue.id },
                data: { status: 'OPEN', snoozedUntil: null, version: { increment: 1 } },
            }),
            prisma.ownerIssueEvent.create({
                data: {
                    ownerIssueId: issue.id,
                    eventType: 'REOPENED',
                    fromStatus: 'SNOOZED',
                    toStatus: 'OPEN',
                    note: 'Snooze timer expired',
                },
            }),
        ])
    }

    return snoozed.length
}
