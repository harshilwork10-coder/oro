/**
 * GDPR Compliance Module
 * 
 * Data export, deletion, consent management, and privacy controls
 * for GDPR, CCPA, and similar regulations.
 */

import { prisma } from '@/lib/prisma'

// ============================================================================
// DATA SUBJECT RIGHTS
// ============================================================================

/**
 * Export all user data (GDPR Article 20 - Right to Portability)
 */
export async function exportUserData(userId: string): Promise<object> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            franchiseId: true
        }
    })

    if (!user) {
        throw new Error('User not found')
    }

    // Get user's transactions (as employee who processed them)
    const transactions = await prisma.transaction.findMany({
        where: { employeeId: userId },
        select: {
            id: true,
            total: true,
            paymentMethod: true,
            status: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
    })

    // Get user's appointments (as employee)
    const appointments = await prisma.appointment.findMany({
        where: { employeeId: userId },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            createdAt: true
        },
        orderBy: { startTime: 'desc' },
        take: 500
    })

    // Compile the export
    const exportData = {
        exportInfo: {
            exportedAt: new Date().toISOString(),
            userId,
            format: 'JSON',
            version: '1.0'
        },
        personalData: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        },
        activitySummary: {
            totalTransactions: transactions.length,
            totalAppointments: appointments.length
        },
        transactions: transactions.map(t => ({
            id: t.id,
            amount: t.total?.toString(),
            paymentMethod: t.paymentMethod,
            status: t.status,
            date: t.createdAt
        })),
        appointments: appointments.map(a => ({
            id: a.id,
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status,
            bookedAt: a.createdAt
        }))
    }

    return exportData
}

/**
 * Delete user data (GDPR Article 17 - Right to Erasure)
 */
export async function deleteUserData(
    userId: string,
    requestingUserId: string,
    options: {
        anonymize?: boolean
        hardDelete?: boolean
    } = {}
): Promise<{ success: boolean; deletedRecords: number; errors: string[] }> {
    const errors: string[] = []
    let deletedRecords = 0

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, email: true }
    })

    if (!user) {
        return { success: false, deletedRecords: 0, errors: ['User not found'] }
    }

    // Cannot delete PROVIDER role users
    if (user.role === 'PROVIDER') {
        return {
            success: false,
            deletedRecords: 0,
            errors: ['Cannot delete PROVIDER accounts']
        }
    }

    try {
        if (options.anonymize) {
            // Anonymize user data instead of deleting
            await prisma.user.update({
                where: { id: userId },
                data: {
                    name: 'Deleted User',
                    email: `deleted_${userId}@deleted.local`,
                    password: null,
                    pin: null,
                    image: null
                }
            })
            deletedRecords = 1
        } else if (options.hardDelete) {
            // Delete user permissions first
            const permResult = await prisma.userPermission.deleteMany({
                where: { userId }
            })
            deletedRecords += permResult.count

            // Update transactions to remove employee reference
            await prisma.transaction.updateMany({
                where: { employeeId: userId },
                data: { employeeId: null }
            })

            // Delete the user
            await prisma.user.delete({
                where: { id: userId }
            })
            deletedRecords++
        }

        return { success: true, deletedRecords, errors }
    } catch (error) {
        console.error('Error deleting user data:', error)
        errors.push(error instanceof Error ? error.message : 'Unknown error')
        return { success: false, deletedRecords, errors }
    }
}

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

export type ConsentType =
    | 'MARKETING_EMAIL'
    | 'MARKETING_SMS'
    | 'ANALYTICS'
    | 'PERSONALIZATION'
    | 'THIRD_PARTY_SHARING'

export interface ConsentRecord {
    id: string
    userId: string
    consentType: ConsentType
    granted: boolean
    grantedAt?: Date
    revokedAt?: Date
    source: 'WEB' | 'APP' | 'ADMIN' | 'API'
    ipAddress?: string
    version: string
}

// In-memory consent store (use database in production)
const consentStore = new Map<string, Map<ConsentType, ConsentRecord>>()

function getConsentStoreKey(userId: string): Map<ConsentType, ConsentRecord> {
    if (!consentStore.has(userId)) {
        consentStore.set(userId, new Map())
    }
    return consentStore.get(userId)!
}

export function recordConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    source: ConsentRecord['source'],
    ipAddress?: string,
    version: string = '1.0'
): ConsentRecord {
    const userConsents = getConsentStoreKey(userId)

    const record: ConsentRecord = {
        id: `consent_${Date.now()}`,
        userId,
        consentType,
        granted,
        grantedAt: granted ? new Date() : undefined,
        revokedAt: granted ? undefined : new Date(),
        source,
        ipAddress,
        version
    }

    userConsents.set(consentType, record)
    return record
}

export function hasConsent(userId: string, consentType: ConsentType): boolean {
    const userConsents = consentStore.get(userId)
    if (!userConsents) return false
    const record = userConsents.get(consentType)
    return record?.granted ?? false
}

export function getUserConsents(userId: string): ConsentRecord[] {
    const userConsents = consentStore.get(userId)
    if (!userConsents) return []
    return Array.from(userConsents.values())
}

export function revokeConsent(
    userId: string,
    consentType: ConsentType,
    source: ConsentRecord['source'],
    ipAddress?: string
): ConsentRecord | null {
    const userConsents = getConsentStoreKey(userId)
    const existing = userConsents.get(consentType)
    if (!existing) return null

    const record: ConsentRecord = {
        ...existing,
        granted: false,
        revokedAt: new Date(),
        source,
        ipAddress
    }

    userConsents.set(consentType, record)
    return record
}

export function revokeAllConsents(userId: string, source: ConsentRecord['source']): number {
    const userConsents = consentStore.get(userId)
    if (!userConsents) return 0

    let count = 0
    for (const [type, record] of userConsents) {
        if (record.granted) {
            revokeConsent(userId, type, source)
            count++
        }
    }
    return count
}

// ============================================================================
// DATA RETENTION
// ============================================================================

export interface RetentionPolicy {
    dataType: string
    retentionDays: number
    action: 'DELETE' | 'ANONYMIZE' | 'ARCHIVE'
    legalBasis: string
}

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
    {
        dataType: 'TRANSACTION_DATA',
        retentionDays: 365 * 7,
        action: 'ARCHIVE',
        legalBasis: 'Legal obligation - tax records'
    },
    {
        dataType: 'SESSION_DATA',
        retentionDays: 30,
        action: 'DELETE',
        legalBasis: 'Legitimate interest - security'
    },
    {
        dataType: 'MARKETING_DATA',
        retentionDays: 365 * 3,
        action: 'DELETE',
        legalBasis: 'Consent'
    }
]

export function getRetentionPolicy(dataType: string): RetentionPolicy | undefined {
    return DEFAULT_RETENTION_POLICIES.find(p => p.dataType === dataType)
}

export function getAllRetentionPolicies(): RetentionPolicy[] {
    return DEFAULT_RETENTION_POLICIES
}

export function shouldPurgeData(
    dataType: string,
    dataDate: Date
): { shouldPurge: boolean; policy?: RetentionPolicy; daysOld: number } {
    const policy = getRetentionPolicy(dataType)
    if (!policy) return { shouldPurge: false, daysOld: 0 }

    const now = new Date()
    const daysOld = Math.floor((now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
        shouldPurge: daysOld >= policy.retentionDays,
        policy,
        daysOld
    }
}

// ============================================================================
// PRIVACY DASHBOARD
// ============================================================================

export interface PrivacyDashboard {
    consents: ConsentRecord[]
    dataCategories: { category: string; recordCount: number }[]
    retentionPolicies: RetentionPolicy[]
}

export async function getPrivacyDashboard(userId: string): Promise<PrivacyDashboard> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
    })

    if (!user) throw new Error('User not found')

    // Count transactions and appointments
    const transactionCount = await prisma.transaction.count({
        where: { employeeId: userId }
    })

    const appointmentCount = await prisma.appointment.count({
        where: { employeeId: userId }
    })

    return {
        consents: getUserConsents(userId),
        dataCategories: [
            { category: 'Personal Information', recordCount: 1 },
            { category: 'Transactions', recordCount: transactionCount },
            { category: 'Appointments', recordCount: appointmentCount }
        ],
        retentionPolicies: getAllRetentionPolicies()
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const gdprCompliance = {
    exportUserData,
    deleteUserData,
    recordConsent,
    hasConsent,
    getUserConsents,
    revokeConsent,
    revokeAllConsents,
    getRetentionPolicy,
    getAllRetentionPolicies,
    shouldPurgeData,
    getPrivacyDashboard
}
