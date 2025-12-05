/**
 * Audit Logging Utility
 * Tracks security-sensitive operations for compliance and debugging
 */

import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'LOGIN_FAILED'
    | 'PASSWORD_CHANGE'
    | 'PERMISSION_CHANGE'
    | 'EXPORT'
    | 'IMPORT'
    | 'BULK_DELETE'
    | 'CONFIG_CHANGE'

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'BLOCKED'

export interface AuditLogParams {
    userId: string
    userEmail: string
    userRole: string
    action: AuditAction
    resource: string
    resourceId?: string
    details?: Record<string, unknown>
    oldValue?: unknown
    newValue?: unknown
    status?: AuditStatus
    errorMessage?: string
}

/**
 * Get client IP address from request headers
 */
async function getClientIp(): Promise<string | null> {
    try {
        const headersList = await headers()
        // Check common headers in order of reliability
        const forwardedFor = headersList.get('x-forwarded-for')
        if (forwardedFor) {
            // x-forwarded-for can contain multiple IPs, take the first one
            return forwardedFor.split(',')[0].trim()
        }

        return headersList.get('x-real-ip') ||
            headersList.get('cf-connecting-ip') || // Cloudflare
            null
    } catch {
        return null
    }
}

/**
 * Get user agent from request headers
 */
async function getUserAgent(): Promise<string | null> {
    try {
        const headersList = await headers()
        return headersList.get('user-agent')
    } catch {
        return null
    }
}

/**
 * Log an audit event
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
    try {
        const [ipAddress, userAgent] = await Promise.all([
            getClientIp(),
            getUserAgent()
        ])

        // Combine details, oldValue, newValue into changes JSON
        const changes = {
            details: params.details || null,
            oldValue: params.oldValue || null,
            newValue: params.newValue || null
        }

        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                userEmail: params.userEmail || null,
                userRole: params.userRole || null,
                action: params.action,
                entityType: params.resource,
                entityId: params.resourceId || 'N/A',
                ipAddress,
                userAgent,
                changes: JSON.stringify(changes),
                status: params.status || 'SUCCESS',
                errorMessage: params.errorMessage || null
            }
        })
    } catch (error) {
        // Don't let audit logging failures break the main operation
        console.error('Failed to create audit log:', error)
    }
}

/**
 * Log a successful operation
 */
export async function logSuccess(
    params: Omit<AuditLogParams, 'status'>
): Promise<void> {
    return logAudit({ ...params, status: 'SUCCESS' })
}

/**
 * Log a failed operation
 */
export async function logFailure(
    params: Omit<AuditLogParams, 'status'> & { errorMessage: string }
): Promise<void> {
    return logAudit({ ...params, status: 'FAILURE' })
}

/**
 * Log a blocked operation (e.g., rate limited, unauthorized)
 */
export async function logBlocked(
    params: Omit<AuditLogParams, 'status'> & { errorMessage: string }
): Promise<void> {
    return logAudit({ ...params, status: 'BLOCKED' })
}

/**
 * Create an audit logger for a specific user session
 * Useful for reusing across multiple operations
 */
export function createAuditLogger(session: {
    userId: string
    userEmail: string
    userRole: string
}) {
    return {
        log: (params: Omit<AuditLogParams, 'userId' | 'userEmail' | 'userRole'>) =>
            logAudit({
                ...params,
                userId: session.userId,
                userEmail: session.userEmail,
                userRole: session.userRole
            }),

        success: (params: Omit<AuditLogParams, 'userId' | 'userEmail' | 'userRole' | 'status'>) =>
            logSuccess({
                ...params,
                userId: session.userId,
                userEmail: session.userEmail,
                userRole: session.userRole
            }),

        failure: (params: Omit<AuditLogParams, 'userId' | 'userEmail' | 'userRole' | 'status'> & { errorMessage: string }) =>
            logFailure({
                ...params,
                userId: session.userId,
                userEmail: session.userEmail,
                userRole: session.userRole
            }),

        blocked: (params: Omit<AuditLogParams, 'userId' | 'userEmail' | 'userRole' | 'status'> & { errorMessage: string }) =>
            logBlocked({
                ...params,
                userId: session.userId,
                userEmail: session.userEmail,
                userRole: session.userRole
            })
    }
}
