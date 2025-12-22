// Audit Log Helper - Log all user actions for legal protection
// Usage: await logActivity(session, 'ACTION_TYPE', { ...details })

import { prisma } from '@/lib/prisma'

interface LogActivityParams {
    userId: string
    userEmail?: string
    userRole?: string
    franchiseId?: string
    locationId?: string
    action: string
    entityType: string
    entityId?: string
    details?: Record<string, any>
    ipAddress?: string
    userAgent?: string
}

/**
 * Log any user activity to the audit trail
 * Call this from API routes to track what users do
 */
export async function logActivity({
    userId,
    userEmail,
    userRole,
    franchiseId,
    locationId,
    action,
    entityType,
    entityId,
    details,
    ipAddress,
    userAgent
}: LogActivityParams) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                userEmail: userEmail || 'unknown',
                userRole: userRole || 'unknown',
                action,
                entityType,
                entityId: entityId || 'N/A',
                changes: details ? JSON.stringify({
                    ...details,
                    franchiseId,
                    locationId,
                    timestamp: new Date().toISOString()
                }) : null,
                ipAddress,
                userAgent,
                status: 'SUCCESS'
            }
        })
    } catch (error) {
        // Don't let logging errors break the main flow
        console.error('[AUDIT] Failed to log activity:', error)
    }
}

/**
 * Get activity log for a franchise/account
 * Use in Account Configs to show all user activity
 */
export async function getActivityLog(params: {
    franchiseId?: string
    userId?: string
    entityType?: string
    limit?: number
    offset?: number
}) {
    const { franchiseId, userId, entityType, limit = 100, offset = 0 } = params

    const where: any = {}

    if (userId) {
        where.userId = userId
    }

    if (entityType) {
        where.entityType = entityType
    }

    // If franchiseId, we need to filter by changes JSON containing franchiseId
    // For SQLite this is a string LIKE match
    if (franchiseId) {
        where.changes = {
            contains: franchiseId
        }
    }

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
    })

    return logs.map(log => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes) : null
    }))
}

// Common action types for consistency
export const ActionTypes = {
    // Authentication
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    PIN_LOGIN: 'PIN_LOGIN',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',

    // POS Actions
    SALE_COMPLETED: 'SALE_COMPLETED',
    REFUND_PROCESSED: 'REFUND_PROCESSED',
    VOID_TRANSACTION: 'VOID_TRANSACTION',
    CASH_DRAWER_OPEN: 'CASH_DRAWER_OPEN',
    DISCOUNT_APPLIED: 'DISCOUNT_APPLIED',
    PRICE_OVERRIDE: 'PRICE_OVERRIDE',

    // Shift Actions
    SHIFT_STARTED: 'SHIFT_STARTED',
    SHIFT_ENDED: 'SHIFT_ENDED',
    CLOCK_IN: 'CLOCK_IN',
    CLOCK_OUT: 'CLOCK_OUT',

    // Inventory
    PRODUCT_ADDED: 'PRODUCT_ADDED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    PRODUCT_DELETED: 'PRODUCT_DELETED',
    STOCK_ADJUSTED: 'STOCK_ADJUSTED',

    // Employee Management
    EMPLOYEE_ADDED: 'EMPLOYEE_ADDED',
    EMPLOYEE_UPDATED: 'EMPLOYEE_UPDATED',
    EMPLOYEE_DELETED: 'EMPLOYEE_DELETED',
    PERMISSIONS_CHANGED: 'PERMISSIONS_CHANGED',

    // Settings
    SETTINGS_UPDATED: 'SETTINGS_UPDATED',

    // Customer
    CUSTOMER_ADDED: 'CUSTOMER_ADDED',
    CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',

    // Appointments
    APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
    APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
    APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',

    // Reports
    REPORT_VIEWED: 'REPORT_VIEWED',
    REPORT_EXPORTED: 'REPORT_EXPORTED'
} as const

export type ActionType = keyof typeof ActionTypes
