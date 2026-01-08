import { prisma } from './prisma'
import { headers } from 'next/headers'

/**
 * Centralized Audit Logging Utility
 * 
 * Use this to log all critical user actions for compliance and debugging.
 * 
 * Usage:
 *   await auditLog({
 *     userId: session.user.id,
 *     action: 'UPDATE',
 *     entityType: 'Appointment',
 *     entityId: appointment.id,
 *     franchiseId: user.franchiseId,
 *     metadata: { before: oldStatus, after: newStatus }
 *   })
 */

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'APPROVE'
    | 'REJECT'
    | 'COMPLETE'
    | 'CANCEL'
    | 'REFUND'
    | 'NO_SHOW'
    | 'SETTINGS_CHANGE'
    | 'ROLE_CHANGE'
    | 'BOOKING'
    | 'PAYMENT'

export interface AuditLogParams {
    userId?: string | null
    userEmail?: string | null
    userRole?: string | null
    action: AuditAction | string
    entityType: string
    entityId?: string | null
    franchiseId?: string | null
    locationId?: string | null
    metadata?: Record<string, unknown>
}

/**
 * Log an audit event
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
    try {
        // Get request headers for IP and user agent (if available)
        let ipAddress: string | null = null
        let userAgent: string | null = null

        try {
            const headersList = await headers()
            ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip')
            userAgent = headersList.get('user-agent')
        } catch {
            // Headers not available (e.g., in non-request context)
        }

        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                userEmail: params.userEmail,
                userRole: params.userRole,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                franchiseId: params.franchiseId,
                locationId: params.locationId,
                ipAddress,
                userAgent,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null
            }
        })
    } catch (error) {
        // Never fail the main operation due to audit logging failure
        console.error('Audit log failed:', error)
    }
}

/**
 * Helper for logging setting changes
 */
export async function auditSettingChange(
    userId: string,
    userEmail: string,
    franchiseId: string,
    settingName: string,
    oldValue: unknown,
    newValue: unknown
): Promise<void> {
    await auditLog({
        userId,
        userEmail,
        action: 'SETTINGS_CHANGE',
        entityType: 'Settings',
        entityId: settingName,
        franchiseId,
        metadata: {
            setting: settingName,
            before: oldValue,
            after: newValue
        }
    })
}

/**
 * Helper for logging transactions
 */
export async function auditTransaction(
    userId: string,
    action: 'CREATE' | 'REFUND' | 'VOID',
    transactionId: string,
    franchiseId: string,
    locationId: string,
    amount: number,
    paymentMethod: string
): Promise<void> {
    await auditLog({
        userId,
        action,
        entityType: 'Transaction',
        entityId: transactionId,
        franchiseId,
        locationId,
        metadata: {
            amount,
            paymentMethod
        }
    })
}

/**
 * Helper for logging appointments
 */
export async function auditAppointment(
    userId: string | null,
    action: 'BOOKING' | 'CANCEL' | 'COMPLETE' | 'NO_SHOW' | 'UPDATE',
    appointmentId: string,
    franchiseId: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    await auditLog({
        userId,
        action,
        entityType: 'Appointment',
        entityId: appointmentId,
        franchiseId,
        metadata
    })
}
