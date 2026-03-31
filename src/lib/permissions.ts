/**
 * ORO 9 — Permission Utilities
 * 
 * ═══════════════════════════════════════════════════════════════════
 * SOURCE OF TRUTH — PERMISSION SYSTEM
 * ═══════════════════════════════════════════════════════════════════
 * The CANONICAL permission system for operational actions is boolean
 * fields on the User model:
 *   canProcessRefunds, canAddServices, canManageInventory,
 *   canManageSchedule, canManageEmployees, canManageShifts,
 *   canClockIn, canClockOut
 * 
 * These are checked directly in API routes (e.g., pos/refund, pos/void).
 * 
 * This file provides ROLE-BASED permissions (what pages/features a role
 * can access). For operational permission checks (refund, void, etc.),
 * use the boolean fields on the User model directly.
 * 
 * DEPRECATED — do not use:
 *   - Permission / UserPermission tables (zero runtime consumers)
 *   - customPermissions JSON field on User (not checked anywhere)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * SOURCE OF TRUTH — ROLE SYSTEM
 * ═══════════════════════════════════════════════════════════════════
 * The canonical role system is `User.role` (string field).
 * See src/lib/auth/mobileAuth.ts for full documentation.
 * ═══════════════════════════════════════════════════════════════════
 */

import { User } from '@prisma/client'

// Roles matching the UserRole enum in schema.prisma
// SOURCE OF TRUTH: User.role string field
export enum Role {
    PROVIDER = 'PROVIDER',              // Platform owner (Oronex)
    ADMIN = 'ADMIN',                    // Provider-equivalent assistant
    FRANCHISOR = 'FRANCHISOR',          // Brand owner or multi-location owner
    FRANCHISEE = 'FRANCHISEE',          // Location owner (under a franchisor brand)
    OWNER = 'OWNER',                    // Business owner (independent)
    MANAGER = 'MANAGER',               // Operations manager
    SHIFT_SUPERVISOR = 'SHIFT_SUPERVISOR', // Senior employee with limited manager privileges
    EMPLOYEE = 'EMPLOYEE',              // Front-line staff
    SUB_FRANCHISEE = 'SUB_FRANCHISEE',  // Phase 2 — sub-franchise operator
}

export type Permission =
    | 'view:all_franchisees'
    | 'view:all_franchisors'
    | 'manage:global_catalog'
    | 'view:system_reports'
    | 'manage:royalty_config'
    | 'manage:own_locations'
    | 'view:financial_reports'
    | 'manage:managers'
    | 'access:pos_monitoring'
    | 'access:pos_full'
    | 'manage:employees'
    | 'manage:inventory'
    | 'manage:shifts'
    | 'process:refunds'
    | 'view:operational_reports'
    | 'access:pos_with_shift'
    | 'clock:in_out'
    | 'view:own_schedule'
    | 'view:z_report'

export function getRolePermissions(roleStr: string): Permission[] {
    const role = roleStr as Role

    switch (role) {
        case Role.PROVIDER:
        case Role.ADMIN:
            // Platform owner - highest level access
            return [
                'view:all_franchisors',
                'view:all_franchisees',
                'manage:global_catalog',
                'view:system_reports',
                'manage:royalty_config'
            ]
        case Role.FRANCHISOR:
            return [
                'view:all_franchisees',
                'manage:global_catalog',
                'view:system_reports',
                'manage:royalty_config'
            ]
        case Role.FRANCHISEE:
        case Role.OWNER:
            return [
                'manage:own_locations',
                'view:financial_reports',
                'manage:managers',
                'access:pos_monitoring',
                'manage:inventory',
                'view:operational_reports',
                'view:z_report'
            ]
        case Role.MANAGER:
            return [
                'access:pos_full',
                'manage:employees',
                'manage:inventory',
                'manage:shifts',
                'process:refunds',
                'view:operational_reports',
                'clock:in_out',
                'view:own_schedule',
                'view:z_report'
            ]
        case Role.SHIFT_SUPERVISOR:
            // Same as EMPLOYEE plus shift management
            return [
                'access:pos_with_shift',
                'manage:shifts',
                'clock:in_out',
                'view:own_schedule',
                'view:z_report'
            ]
        case Role.EMPLOYEE:
            return [
                'access:pos_with_shift',
                'clock:in_out',
                'view:own_schedule',
                'view:z_report'  // Employees can view end of day cash report
            ]
        default:
            return []
    }
}

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
    if (!user || !user.role) return false

    const rolePermissions = getRolePermissions(user.role)

    // Check role-based permissions
    if (rolePermissions.includes(permission)) return true

    // DEPRECATED: customPermissions JSON is not checked.
    // Future migration: read from UserPermission table via checkPermission() utility.

    return false
}

// Helper to check if user needs a shift to access POS
export function requiresShiftForPOS(user: User | null | undefined): boolean {
    if (!user) return true
    const role = user.role as Role

    // Only Employees and Shift Supervisors require a shift
    // Managers, Owners, Franchisees, Franchisors, Providers do NOT require a shift
    return role === Role.EMPLOYEE || role === Role.SHIFT_SUPERVISOR
}

// Helper to check if user can manage another user
export function canManageUser(manager: User, targetUser: User): boolean {
    if (!manager || !targetUser) return false

    const managerRole = manager.role as Role
    const targetRole = targetUser.role as Role

    if (managerRole === Role.FRANCHISOR || managerRole === Role.PROVIDER || managerRole === Role.ADMIN) {
        return true
    }

    if (managerRole === Role.FRANCHISEE || managerRole === Role.OWNER) {
        // Owner/Franchisee can manage anyone in their franchise
        return manager.franchiseId === targetUser.franchiseId
    }

    if (managerRole === Role.MANAGER) {
        // Manager can manage employees in their location
        return manager.locationId === targetUser.locationId &&
            (targetRole === Role.EMPLOYEE || targetRole === Role.SHIFT_SUPERVISOR)
    }

    return false
}

