import { User } from '@prisma/client'

export const PERMISSIONS = {
    MANAGE_SERVICES: 'canAddServices',
    MANAGE_PRODUCTS: 'canAddProducts',
    MANAGE_INVENTORY: 'canManageInventory',
    VIEW_REPORTS: 'canViewReports',
    PROCESS_REFUNDS: 'canProcessRefunds',
    MANAGE_SCHEDULE: 'canManageSchedule',
    MANAGE_EMPLOYEES: 'canManageEmployees',
} as const

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export function hasPermission(user: Partial<User> | null | undefined, permission: PermissionKey | null): boolean {
    // If no permission required, always allow
    if (permission === null || permission === undefined) {
        return true
    }

    if (!user) return false

    // Franchise Owners and Admins have all permissions
    if (user.role === 'FRANCHISEE' || user.role === 'ADMIN' || user.role === 'FRANCHISOR') {
        return true
    }

    // Employee role check - must be explicitly set
    if (user.role === 'EMPLOYEE') {
        return !!user[permission as keyof User]
    }

    // Default deny
    return false
}
