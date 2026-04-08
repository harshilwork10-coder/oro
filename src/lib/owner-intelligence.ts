/**
 * Owner Intelligence Engine — Single source of truth
 * 
 * All scoring, dedup, action validation, and franchise resolution lives here.
 * No duplicate logic across API routes.
 */

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type {
    OwnerSignalType,
    OwnerIssueCategory,
    OwnerIssueSeverity,
    OwnerIssueStatus,
    OwnerIssueEventType,
    OwnerIssueResolvedReason,
} from '@prisma/client'

// Defined locally because not used as a model field type (Prisma only exports field-bound enums)
export type OwnerRecommendationScope = 'OWNER' | 'DELEGATABLE' | 'AUTO_CANDIDATE'

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

/** Default attention weights per signal type (0-100). Owners can override. */
export const OWNER_ATTENTION_WEIGHTS: Record<OwnerSignalType, number> = {
    DEPOSIT_OVERDUE: 90,
    CASH_VARIANCE: 85,
    ID_CHECK_MISSED: 85,
    EMPLOYEE_RISK_HIGH: 80,
    DEVICE_OFFLINE: 75,
    LOW_STOCK_CRITICAL: 65,
    VOID_SPIKE: 65,
    SALES_DROP: 60,
    TRANSFER_DISCREPANCY: 55,
    REFUND_SPIKE: 50,
}

/** Map signal types to issue categories */
export const SIGNAL_TO_CATEGORY: Record<OwnerSignalType, OwnerIssueCategory> = {
    CASH_VARIANCE: 'CASH',
    DEPOSIT_OVERDUE: 'CASH',
    VOID_SPIKE: 'EMPLOYEE',
    REFUND_SPIKE: 'EMPLOYEE',
    LOW_STOCK_CRITICAL: 'INVENTORY',
    SALES_DROP: 'SALES',
    ID_CHECK_MISSED: 'COMPLIANCE',
    EMPLOYEE_RISK_HIGH: 'EMPLOYEE',
    DEVICE_OFFLINE: 'OPERATIONS',
    TRANSFER_DISCREPANCY: 'INVENTORY',
}

/** Reopen window: if resolved issue recurs within this many hours, reopen instead of new */
export const REOPEN_WINDOW_HOURS = 72

/** Auto-escalation thresholds */
export const ESCALATION_RULES = {
    CRITICAL_OPEN_HOURS: 4,
    HIGH_OPEN_HOURS: 24,
}

/** Cool-down windows (hours) per signal type — skip re-alert within this window */
export const COOLDOWN_HOURS: Partial<Record<OwnerSignalType, number>> = {
    LOW_STOCK_CRITICAL: 24,
    SALES_DROP: 24,
    VOID_SPIKE: 168, // 1 week
    REFUND_SPIKE: 168,
    DEVICE_OFFLINE: 1,
}

// ═══════════════════════════════════════════════════════════════
// Auth & Franchise Resolution (shared across all owner routes)
// ═══════════════════════════════════════════════════════════════

export interface OwnerContext {
    userId: string
    userName: string
    franchiseId: string
}

/**
 * Resolve the owner's session and franchise ID.
 * Reusable across all /api/owner/* routes — eliminates duplicate auth blocks.
 */
export async function getOwnerContext(): Promise<OwnerContext | null> {
    const session = await getServerSession(authOptions)
    if (!session?.user) return null

    const user = session.user as any

    // SECURITY: Only owner-level roles can access owner intelligence
    const allowedRoles = ['OWNER', 'FRANCHISEE', 'FRANCHISOR', 'PROVIDER', 'ADMIN', 'MANAGER']
    if (!user.role || !allowedRoles.includes(user.role)) return null

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            id: true,
            name: true,
            franchiseId: true,
            franchisor: {
                select: {
                    franchises: {
                        select: { id: true },
                        take: 1,
                    },
                },
            },
        },
    })

    let franchiseId = dbUser?.franchiseId
    if (!franchiseId && dbUser?.franchisor?.franchises?.[0]?.id) {
        franchiseId = dbUser.franchisor.franchises[0].id
    }
    if (!franchiseId || !dbUser) return null

    return {
        userId: dbUser.id,
        userName: dbUser.name || 'Unknown',
        franchiseId,
    }
}

// ═══════════════════════════════════════════════════════════════
// Priority Scoring
// ═══════════════════════════════════════════════════════════════

export interface ScoreInputs {
    financialImpact: number   // Dollar amount
    urgencyScore: number      // 0-100
    urgencyReason?: string
    repeatCount: number
    complianceRisk: number    // 0-100
}

export interface ScoreResult {
    priorityScore: number
    severity: OwnerIssueSeverity
    reasoning: string
}

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val))
}

/**
 * Compute priority score for a signal.
 * Formula: Financial(30%) + Urgency(25%) + Repeat(20%) + Compliance(15%) + OwnerWeight(10%)
 */
export function computePriorityScore(
    signalType: OwnerSignalType,
    inputs: ScoreInputs,
    weightOverrides?: Record<string, number> | null,
): ScoreResult {
    const ownerWeight = weightOverrides?.[signalType]
        ?? OWNER_ATTENTION_WEIGHTS[signalType]
        ?? 50

    const financial = clamp(inputs.financialImpact / 500 * 100, 0, 100)
    const urgency = clamp(inputs.urgencyScore, 0, 100)
    const repeat = clamp(inputs.repeatCount * 20, 0, 100)
    const compliance = clamp(inputs.complianceRisk, 0, 100)

    const score =
        financial * 0.30 +
        urgency * 0.25 +
        repeat * 0.20 +
        compliance * 0.15 +
        (ownerWeight / 100) * 100 * 0.10

    const severity: OwnerIssueSeverity =
        score >= 75 ? 'CRITICAL' :
            score >= 50 ? 'HIGH' :
                score >= 25 ? 'MEDIUM' : 'LOW'

    const reasons: string[] = []
    if (financial >= 60) reasons.push(`$${inputs.financialImpact.toFixed(0)} financial impact`)
    if (urgency >= 70) reasons.push(`time-sensitive${inputs.urgencyReason ? ` (${inputs.urgencyReason})` : ''}`)
    if (repeat >= 60) reasons.push(`recurring (${inputs.repeatCount}x)`)
    if (compliance >= 50) reasons.push('compliance risk')

    return {
        priorityScore: Math.round(score * 10) / 10,
        severity,
        reasoning: `${severity} because: ${reasons.join(' + ') || 'baseline priority'}`,
    }
}

/** Return the higher of two severities */
export function higherSeverity(a: OwnerIssueSeverity, b: OwnerIssueSeverity): OwnerIssueSeverity {
    const order: OwnerIssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    return order.indexOf(a) >= order.indexOf(b) ? a : b
}

// ═══════════════════════════════════════════════════════════════
// DedupKey Generation
// ═══════════════════════════════════════════════════════════════

/**
 * Build a dedup key for a signal. Same key = same issue.
 */
export function buildDedupKey(
    locationId: string,
    signalType: OwnerSignalType,
    entityId: string | null,
    signalDate: Date,
): string {
    const bizDate = signalDate.toISOString().slice(0, 10) // YYYY-MM-DD
    const isoWeek = getISOWeek(signalDate)
    const month = signalDate.toISOString().slice(0, 7) // YYYY-MM

    switch (signalType) {
        case 'CASH_VARIANCE':
            return `loc:${locationId}:CASH_VARIANCE:drawer:${entityId || 'any'}:date:${bizDate}`
        case 'DEPOSIT_OVERDUE':
            return `loc:${locationId}:DEPOSIT_OVERDUE:since:${bizDate}`
        case 'VOID_SPIKE':
            return `loc:${locationId}:VOID_SPIKE:user:${entityId}:week:${isoWeek}`
        case 'REFUND_SPIKE':
            return `loc:${locationId}:REFUND_SPIKE:user:${entityId}:week:${isoWeek}`
        case 'LOW_STOCK_CRITICAL':
            return `loc:${locationId}:LOW_STOCK:sku:${entityId}`
        case 'SALES_DROP':
            return `loc:${locationId}:SALES_DROP:date:${bizDate}`
        case 'ID_CHECK_MISSED':
            return `loc:${locationId}:ID_CHECK_MISSED:shift:${bizDate}`
        case 'EMPLOYEE_RISK_HIGH':
            return `loc:${locationId}:EMPLOYEE_RISK:user:${entityId}:month:${month}`
        case 'DEVICE_OFFLINE':
            return `loc:${locationId}:DEVICE_OFFLINE:device:${entityId}`
        case 'TRANSFER_DISCREPANCY':
            return `loc:${locationId}:TRANSFER_DISC:${entityId}:date:${bizDate}`
        default:
            return `loc:${locationId}:${signalType}:${entityId || 'none'}:${bizDate}`
    }
}

function getISOWeek(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

// ═══════════════════════════════════════════════════════════════
// Issue Action Validation (State Machine)
// ═══════════════════════════════════════════════════════════════

export type IssueAction = 'ACKNOWLEDGE' | 'ASSIGN' | 'SNOOZE' | 'RESOLVE' | 'ESCALATE' | 'NOTE' | 'REOPEN'

const VALID_TRANSITIONS: Record<OwnerIssueStatus, IssueAction[]> = {
    OPEN: ['ACKNOWLEDGE', 'ASSIGN', 'SNOOZE', 'RESOLVE', 'ESCALATE', 'NOTE'],
    ACKNOWLEDGED: ['ASSIGN', 'SNOOZE', 'RESOLVE', 'ESCALATE', 'NOTE'],
    ASSIGNED: ['ACKNOWLEDGE', 'ASSIGN', 'SNOOZE', 'RESOLVE', 'ESCALATE', 'NOTE'],
    SNOOZED: ['ACKNOWLEDGE', 'ASSIGN', 'RESOLVE', 'ESCALATE', 'NOTE'],
    ESCALATED: ['ACKNOWLEDGE', 'ASSIGN', 'RESOLVE', 'NOTE'],
    RESOLVED: ['REOPEN', 'NOTE'],
    REOPENED: ['ACKNOWLEDGE', 'ASSIGN', 'SNOOZE', 'RESOLVE', 'ESCALATE', 'NOTE'],
}

/**
 * Validate a status transition. Returns error message or null.
 */
export function validateTransition(currentStatus: OwnerIssueStatus, action: IssueAction): string | null {
    const allowed = VALID_TRANSITIONS[currentStatus]
    if (!allowed || !allowed.includes(action)) {
        return `Cannot ${action} an issue in ${currentStatus} status`
    }
    return null
}

/**
 * Map an action to the resulting status (null = no status change, e.g. NOTE)
 */
export function actionToStatus(action: IssueAction): OwnerIssueStatus | null {
    switch (action) {
        case 'ACKNOWLEDGE': return 'ACKNOWLEDGED'
        case 'ASSIGN': return 'ASSIGNED'
        case 'SNOOZE': return 'SNOOZED'
        case 'RESOLVE': return 'RESOLVED'
        case 'ESCALATE': return 'ESCALATED'
        case 'REOPEN': return 'REOPENED'
        case 'NOTE': return null
    }
}

/**
 * Map an action to its event type
 */
export function actionToEventType(action: IssueAction): OwnerIssueEventType {
    switch (action) {
        case 'ACKNOWLEDGE': return 'ACKNOWLEDGED'
        case 'ASSIGN': return 'ASSIGNED'
        case 'SNOOZE': return 'SNOOZED'
        case 'RESOLVE': return 'RESOLVED'
        case 'ESCALATE': return 'ESCALATED'
        case 'REOPEN': return 'REOPENED'
        case 'NOTE': return 'NOTE_ADDED'
    }
}

// ═══════════════════════════════════════════════════════════════
// Recommendation Helpers
// ═══════════════════════════════════════════════════════════════

/** Map issue type to a human-readable recommended action */
export function generateActionText(issueType: OwnerSignalType, locationName: string): string {
    switch (issueType) {
        case 'CASH_VARIANCE': return `Review cash count at ${locationName}`
        case 'DEPOSIT_OVERDUE': return `Verify deposit slip for ${locationName}`
        case 'VOID_SPIKE': return `Review void details with manager`
        case 'REFUND_SPIKE': return `Check refund history with manager`
        case 'LOW_STOCK_CRITICAL': return `Reorder or transfer stock to ${locationName}`
        case 'SALES_DROP': return `Check staffing and promotions at ${locationName}`
        case 'ID_CHECK_MISSED': return `Audit ID check compliance at ${locationName}`
        case 'EMPLOYEE_RISK_HIGH': return `Investigate employee activity`
        case 'DEVICE_OFFLINE': return `Check device connectivity at ${locationName}`
        case 'TRANSFER_DISCREPANCY': return `Reconcile transfer at ${locationName}`
    }
}

/** Whether an issue type can be delegated to a manager */
export function canDelegate(issueType: OwnerSignalType): boolean {
    const delegatable: OwnerSignalType[] = [
        'CASH_VARIANCE', 'VOID_SPIKE', 'REFUND_SPIKE',
        'LOW_STOCK_CRITICAL', 'ID_CHECK_MISSED', 'DEVICE_OFFLINE',
    ]
    return delegatable.includes(issueType)
}

export function getRecommendationScope(issueType: OwnerSignalType): OwnerRecommendationScope {
    if (canDelegate(issueType)) return 'DELEGATABLE'
    return 'OWNER'
}

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

export function hoursSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60)
}

/** Get today's business date as a Date object (midnight UTC) */
export function getBusinessDate(date?: Date): Date {
    const d = date || new Date()
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

/** Generate a cron job run ID for idempotency */
export function generateJobRunId(routeName: string): string {
    const now = new Date()
    const hourKey = now.toISOString().slice(0, 13) // YYYY-MM-DDTHH
    return `${routeName}-${hourKey}`
}
