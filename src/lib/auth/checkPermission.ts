/**
 * ORO 9 — Central Permission Check Utility
 * 
 * ═══════════════════════════════════════════════════════════════════
 * SOURCE OF TRUTH — PERMISSION SYSTEM
 * ═══════════════════════════════════════════════════════════════════
 * This utility is the SINGLE entry point for all operational permission
 * checks. Underneath, it reads the canonical boolean fields on User:
 *   canProcessRefunds, canAddServices, canManageInventory,
 *   canManageSchedule, canManageEmployees, canManageShifts,
 *   canClockIn, canClockOut
 * 
 * New code should call checkPermission() instead of directly reading
 * User boolean fields. This gives us one migration point when/if we
 * move to the normalized Permission/UserPermission system later.
 * ═══════════════════════════════════════════════════════════════════
 */

import { prisma } from '@/lib/prisma'

/**
 * Operational permissions mapped to User model boolean fields.
 * These are the only permissions currently enforced at runtime.
 */
export type OperationalPermission =
    | 'refund'         // canProcessRefunds
    | 'void'           // canProcessRefunds (shared)
    | 'add_services'   // canAddServices
    | 'inventory'      // canManageInventory
    | 'schedule'       // canManageSchedule
    | 'employees'      // canManageEmployees
    | 'shifts'         // canManageShifts
    | 'clock_in'       // canClockIn
    | 'clock_out'      // canClockOut

// Roles that bypass permission checks entirely
const BYPASS_ROLES = new Set(['PROVIDER', 'ADMIN', 'FRANCHISOR', 'OWNER', 'FRANCHISEE'])

// Map permission names to User model boolean fields
const PERMISSION_FIELD_MAP: Record<OperationalPermission, string> = {
    refund: 'canProcessRefunds',
    void: 'canProcessRefunds',
    add_services: 'canAddServices',
    inventory: 'canManageInventory',
    schedule: 'canManageSchedule',
    employees: 'canManageEmployees',
    shifts: 'canManageShifts',
    clock_in: 'canClockIn',
    clock_out: 'canClockOut',
}

/**
 * Check if a user has a specific operational permission.
 * 
 * Owner-level roles (PROVIDER, ADMIN, FRANCHISOR, OWNER, FRANCHISEE) always pass.
 * MANAGER passes for most permissions.
 * EMPLOYEE and SHIFT_SUPERVISOR check the User boolean field.
 * 
 * @param userId - The user ID to check
 * @param permission - The operational permission to check
 * @returns true if user has the permission, false otherwise
 */
export async function checkPermission(
    userId: string,
    permission: OperationalPermission
): Promise<boolean> {
    const field = PERMISSION_FIELD_MAP[permission]
    if (!field) return false

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            role: true,
            [field]: true,
        }
    })

    if (!user) return false

    // Owner-level roles bypass all permission checks
    if (BYPASS_ROLES.has(user.role ?? '')) return true

    // MANAGER gets most permissions automatically
    if (user.role === 'MANAGER') {
        // Managers can do everything except maybe clock operations
        return true
    }

    // EMPLOYEE and SHIFT_SUPERVISOR — check the boolean field
    return !!(user as any)[field]
}

/**
 * Check multiple permissions at once.
 * Returns a map of permission → boolean.
 */
export async function checkPermissions(
    userId: string,
    permissions: OperationalPermission[]
): Promise<Record<OperationalPermission, boolean>> {
    // Deduplicate fields to select
    const fields = new Set(permissions.map(p => PERMISSION_FIELD_MAP[p]))
    const selectObj: Record<string, boolean> = { role: true }
    for (const f of fields) selectObj[f] = true

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: selectObj,
    })

    if (!user) {
        return Object.fromEntries(permissions.map(p => [p, false])) as Record<OperationalPermission, boolean>
    }

    const role = (user as any).role as string
    const isBypass = BYPASS_ROLES.has(role)
    const isManager = role === 'MANAGER'

    const result: Record<string, boolean> = {}
    for (const p of permissions) {
        if (isBypass || isManager) {
            result[p] = true
        } else {
            const field = PERMISSION_FIELD_MAP[p]
            result[p] = !!(user as any)[field]
        }
    }

    return result as Record<OperationalPermission, boolean>
}
