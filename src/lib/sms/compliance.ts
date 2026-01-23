/**
 * SMS Compliance + Quota System
 * 
 * Implements:
 * - 1500 free PROMO SMS per location per month
 * - Consent gate (TCPA compliance)
 * - Opt-out handling (STOP)
 * - Frequency caps (1 promo per customer per 7 days)
 * - Duplicate campaign detection
 * - Smart suppression (opt-outs, failures, recent sends)
 * - Required footer validation
 */

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Configuration
const FREE_SMS_QUOTA = 1500  // Units per location per month
const FREQUENCY_CAP_DAYS = 7  // Max 1 promo per customer per X days
const DUPLICATE_LOCKOUT_DAYS = 7  // Block same campaign within X days
const FAILURE_THRESHOLD = 3  // Suppress after X delivery failures in 30 days

export interface SmsRecipient {
    customerId: string
    phone: string
    name?: string
    lastVisit?: Date
    lastPromoReceived?: Date
    hasConsent: boolean
    consentTimestamp?: Date
    isOptedOut: boolean
    deliveryFailures: number
    hasRedeemedCampaign?: boolean
}

export interface SuppressionResult {
    eligible: SmsRecipient[]
    suppressed: {
        reason: string
        count: number
        recipients: SmsRecipient[]
    }[]
}

export interface QuotaInfo {
    monthKey: string
    freeUsed: number
    freeRemaining: number
    overageUsed: number
}

// ============ CONSENT VALIDATION ============

export function validateConsent(recipient: SmsRecipient): { valid: boolean; reason?: string } {
    if (!recipient.hasConsent) {
        return { valid: false, reason: 'NO_CONSENT' }
    }
    if (!recipient.consentTimestamp) {
        return { valid: false, reason: 'NO_CONSENT_TIMESTAMP' }
    }
    return { valid: true }
}

// ============ FOOTER VALIDATION ============

export function validateMessageFooter(message: string, businessName: string): { valid: boolean; reason?: string } {
    const hasBusinessName = message.toLowerCase().includes(businessName.toLowerCase())
    const hasStopText = message.toLowerCase().includes('stop') &&
        (message.toLowerCase().includes('reply stop') ||
            message.toLowerCase().includes('text stop'))

    if (!hasBusinessName) {
        return { valid: false, reason: 'FOOTER_MISSING_BUSINESS_NAME' }
    }
    if (!hasStopText) {
        return { valid: false, reason: 'FOOTER_MISSING_STOP_INSTRUCTIONS' }
    }
    return { valid: true }
}

// ============ SUPPRESSION LOGIC ============

export async function applySuppression(
    recipients: SmsRecipient[],
    locationId: string,
    campaignType: string
): Promise<SuppressionResult> {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - FREQUENCY_CAP_DAYS * 24 * 60 * 60 * 1000)

    const eligible: SmsRecipient[] = []
    const suppressedMap = new Map<string, SmsRecipient[]>()

    // Get opt-outs from database
    const optedOutPhones = await prisma.smsOptOut.findMany({
        select: { phone: true }
    })
    const optOutSet = new Set(optedOutPhones.map(o => o.phone))

    // Get recent promo sends for frequency cap
    const recentSends = await prisma.smsUsageLedger.findMany({
        where: {
            locationId,
            messageType: 'PROMO',
            status: { in: ['SENT', 'DELIVERED'] },
            sentAt: { gte: sevenDaysAgo }
        },
        select: { phone: true }
    })
    const recentSendSet = new Set(recentSends.map(s => s.phone))

    for (const recipient of recipients) {
        let suppressReason: string | null = null

        // Check opt-out (highest priority)
        if (optOutSet.has(recipient.phone) || recipient.isOptedOut) {
            suppressReason = 'OPTED_OUT'
        }
        // Check consent
        else if (!recipient.hasConsent) {
            suppressReason = 'NO_CONSENT'
        }
        // Check delivery failures
        else if (recipient.deliveryFailures >= FAILURE_THRESHOLD) {
            suppressReason = 'DELIVERY_FAILURES'
        }
        // Check frequency cap
        else if (recentSendSet.has(recipient.phone)) {
            suppressReason = 'FREQUENCY_CAP'
        }
        // Check already redeemed
        else if (recipient.hasRedeemedCampaign) {
            suppressReason = 'ALREADY_REDEEMED'
        }
        // Check recent visit (except for REBOOK campaigns)
        else if (campaignType !== 'REBOOK' && recipient.lastVisit) {
            const visitedRecently = recipient.lastVisit.getTime() > sevenDaysAgo.getTime()
            if (visitedRecently) {
                suppressReason = 'RECENT_VISIT'
            }
        }

        if (suppressReason) {
            const list = suppressedMap.get(suppressReason) || []
            list.push(recipient)
            suppressedMap.set(suppressReason, list)
        } else {
            eligible.push(recipient)
        }
    }

    const suppressed = Array.from(suppressedMap.entries()).map(([reason, recipients]) => ({
        reason,
        count: recipients.length,
        recipients
    }))

    return { eligible, suppressed }
}

// ============ DUPLICATE DETECTION ============

export function generateTemplateHash(template: string, audienceType: string): string {
    const normalized = template.toLowerCase().replace(/\s+/g, ' ').trim()
    return crypto.createHash('md5').update(`${normalized}|${audienceType}`).digest('hex')
}

export async function checkDuplicateCampaign(
    locationId: string,
    templateHash: string
): Promise<{ isDuplicate: boolean; blockedUntil?: Date }> {
    const lockoutDate = new Date(Date.now() - DUPLICATE_LOCKOUT_DAYS * 24 * 60 * 60 * 1000)

    const existing = await prisma.dealCampaign.findFirst({
        where: {
            locationId,
            templateHash,
            status: { in: ['SENT', 'SENDING'] },
            sentAt: { gte: lockoutDate }
        },
        orderBy: { sentAt: 'desc' }
    })

    if (existing && existing.sentAt) {
        const blockedUntil = new Date(existing.sentAt.getTime() + DUPLICATE_LOCKOUT_DAYS * 24 * 60 * 60 * 1000)
        return { isDuplicate: true, blockedUntil }
    }

    return { isDuplicate: false }
}

// ============ QUOTA MANAGEMENT ============

export function getMonthKey(date: Date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function getQuotaInfo(locationId: string): Promise<QuotaInfo> {
    const monthKey = getMonthKey()

    const usage = await prisma.smsMonthlyUsage.findUnique({
        where: { locationId_monthKey: { locationId, monthKey } }
    })

    return {
        monthKey,
        freeUsed: usage?.freeUnitsUsed || 0,
        freeRemaining: FREE_SMS_QUOTA - (usage?.freeUnitsUsed || 0),
        overageUsed: usage?.overageUnitsUsed || 0
    }
}

export async function splitByQuota(
    locationId: string,
    estimatedUnits: number
): Promise<{ freeUnits: number; overageUnits: number }> {
    const quota = await getQuotaInfo(locationId)

    const freeUnits = Math.min(estimatedUnits, Math.max(0, quota.freeRemaining))
    const overageUnits = Math.max(0, estimatedUnits - freeUnits)

    return { freeUnits, overageUnits }
}

export async function updateUsage(
    locationId: string,
    freeUnits: number,
    overageUnits: number
): Promise<void> {
    const monthKey = getMonthKey()

    await prisma.smsMonthlyUsage.upsert({
        where: { locationId_monthKey: { locationId, monthKey } },
        create: {
            locationId,
            monthKey,
            freeUnitsUsed: freeUnits,
            overageUnitsUsed: overageUnits
        },
        update: {
            freeUnitsUsed: { increment: freeUnits },
            overageUnitsUsed: { increment: overageUnits }
        }
    })
}

// ============ OPT-OUT HANDLING ============

export async function handleOptOut(phone: string, reason: string = 'STOP'): Promise<void> {
    await prisma.smsOptOut.upsert({
        where: { phone },
        create: { phone, reason },
        update: { reason }
    })
}

export async function isOptedOut(phone: string): Promise<boolean> {
    const optOut = await prisma.smsOptOut.findUnique({ where: { phone } })
    return !!optOut
}

// ============ CAMPAIGN PREVIEW ============

export interface CampaignPreview {
    audienceCount: number
    estimatedUnits: number
    suppressed: { reason: string; count: number }[]
    quota: QuotaInfo
    estimatedFree: number
    estimatedOverage: number
    hasOverage: boolean
    validationErrors: string[]
}

export async function generateCampaignPreview(
    locationId: string,
    recipients: SmsRecipient[],
    messageTemplate: string,
    audienceType: string,
    businessName: string
): Promise<CampaignPreview> {
    const validationErrors: string[] = []

    // Validate footer
    const footerCheck = validateMessageFooter(messageTemplate, businessName)
    if (!footerCheck.valid) {
        validationErrors.push(footerCheck.reason!)
    }

    // Check duplicate
    const templateHash = generateTemplateHash(messageTemplate, audienceType)
    const dupCheck = await checkDuplicateCampaign(locationId, templateHash)
    if (dupCheck.isDuplicate) {
        validationErrors.push(`DUPLICATE_WITHIN_7_DAYS:${dupCheck.blockedUntil?.toISOString()}`)
    }

    // Apply suppression
    const suppression = await applySuppression(recipients, locationId, audienceType)

    // Calculate units (1 message = 1 unit, assuming standard SMS)
    const estimatedUnits = suppression.eligible.length

    // Get quota breakdown
    const quota = await getQuotaInfo(locationId)
    const { freeUnits, overageUnits } = await splitByQuota(locationId, estimatedUnits)

    return {
        audienceCount: suppression.eligible.length,
        estimatedUnits,
        suppressed: suppression.suppressed.map(s => ({ reason: s.reason, count: s.count })),
        quota,
        estimatedFree: freeUnits,
        estimatedOverage: overageUnits,
        hasOverage: overageUnits > 0,
        validationErrors
    }
}
