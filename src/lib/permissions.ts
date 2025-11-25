import { User } from '@prisma/client'

// Define roles matching the database strings
// We use strings here because we haven't fully migrated the DB enum yet
export enum Role {
    PROVIDER = 'PROVIDER',      // Platform/Software owner
    FRANCHISOR = 'FRANCHISOR',  // Brand owner
    FRANCHISEE = 'FRANCHISEE',  // Location owner
    MANAGER = 'MANAGER',        // Operations manager
    EMPLOYEE = 'EMPLOYEE',      // Front-line staff
    USER = 'USER'               // Legacy fallback
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
        case Role.EMPLOYEE:
        case Role.USER:
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

    // Check custom overrides (if implemented in DB as JSON)
    // if (user.customPermissions && user.customPermissions[permission]) return true

    return false
}

// Helper to check if user needs a shift to access POS
export function requiresShiftForPOS(user: User | null | undefined): boolean {
    if (!user) return true
    const role = user.role as Role

    // Only Employees (and legacy Users) require a shift
    // Managers, Franchisees, Franchisors, Providers do NOT require a shift to access POS
    return role === Role.EMPLOYEE || role === Role.USER
}

// Helper to check if user can manage another user
export function canManageUser(manager: User, targetUser: User): boolean {
    if (!manager || !targetUser) return false

    const managerRole = manager.role as Role
    const targetRole = targetUser.role as Role

    if (managerRole === Role.FRANCHISOR || managerRole === Role.PROVIDER) {
        // Franchisor/Provider can manage anyone (conceptually, but maybe restricted by franchiseId)
        return true
    }

    if (managerRole === Role.FRANCHISEE) {
        // Franchisee can manage anyone in their franchise
        return manager.franchiseId === targetUser.franchiseId
    }

    if (managerRole === Role.MANAGER) {
        // Manager can manage employees in their location
        return manager.locationId === targetUser.locationId &&
            targetRole === Role.EMPLOYEE
    }

    return false
}
