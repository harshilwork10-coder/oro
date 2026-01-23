/**
 * ORO 9 Salon Reporting - Scope Enforcement
 * 
 * Backend-enforced scope rules:
 * - FRANCHISOR/PROVIDER: All locations in their franchise
 * - OWNER: All locations in their franchise
 * - MANAGER: Only permitted locations (via membership)
 * - EMPLOYEE: Only their assigned location
 * 
 * @version 1.0.0
 */

import { prisma } from '@/lib/prisma';

export type UserRole = 'PROVIDER' | 'FRANCHISOR' | 'OWNER' | 'MANAGER' | 'EMPLOYEE';

export interface ScopeResult {
    locationIds: string[];
    franchiseId?: string;
    isAllLocations: boolean;
    accessLevel: 'FULL' | 'LIMITED' | 'SELF_ONLY';
}

/**
 * Get allowed location IDs for a user based on their role and permissions
 * This MUST be called on every report API to enforce backend scope
 */
export async function getLocationScope(
    userId: string,
    role: UserRole,
    franchiseId?: string
): Promise<ScopeResult> {
    switch (role) {
        case 'PROVIDER':
            // Provider can see all locations across all franchises
            return {
                locationIds: [],
                isAllLocations: true,
                accessLevel: 'FULL'
            };

        case 'FRANCHISOR':
        case 'OWNER':
            // Franchisor/Owner sees all locations in their franchise
            if (!franchiseId) {
                // Try to get from user record
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { franchiseId: true }
                });
                franchiseId = user?.franchiseId || undefined;
            }

            if (!franchiseId) {
                return {
                    locationIds: [],
                    isAllLocations: false,
                    accessLevel: 'FULL'
                };
            }

            const franchiseLocations = await prisma.location.findMany({
                where: { franchiseId },
                select: { id: true }
            });

            return {
                locationIds: franchiseLocations.map(l => l.id),
                franchiseId,
                isAllLocations: false,
                accessLevel: 'FULL'
            };

        case 'MANAGER':
            // Manager sees locations they are assigned to
            const managerUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { locationId: true, franchiseId: true }
            });

            return {
                locationIds: managerUser?.locationId ? [managerUser.locationId] : [],
                franchiseId: managerUser?.franchiseId || undefined,
                isAllLocations: false,
                accessLevel: 'LIMITED'
            };

        case 'EMPLOYEE':
            // Employee sees only their assigned location
            const employeeUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { locationId: true, franchiseId: true }
            });

            return {
                locationIds: employeeUser?.locationId ? [employeeUser.locationId] : [],
                franchiseId: employeeUser?.franchiseId || undefined,
                isAllLocations: false,
                accessLevel: 'SELF_ONLY'
            };

        default:
            return {
                locationIds: [],
                isAllLocations: false,
                accessLevel: 'SELF_ONLY'
            };
    }
}

/**
 * Validate that a user can access a specific location
 */
export async function canAccessLocation(
    userId: string,
    role: UserRole,
    locationId: string,
    franchiseId?: string
): Promise<boolean> {
    const scope = await getLocationScope(userId, role, franchiseId);

    if (scope.isAllLocations) return true;
    return scope.locationIds.includes(locationId);
}

/**
 * Build Prisma where clause for location-scoped queries
 */
export function buildLocationWhereClause(scope: ScopeResult): { id?: string | { in: string[] } } {
    if (scope.isAllLocations) {
        return {}; // No filter needed
    }

    if (scope.locationIds.length === 0) {
        // User has no access - return impossible condition
        return { id: 'NO_ACCESS' };
    }

    if (scope.locationIds.length === 1) {
        return { id: scope.locationIds[0] };
    }

    return { id: { in: scope.locationIds } };
}

/**
 * Build Prisma where clause for franchise-scoped queries
 */
export function buildFranchiseWhereClause(scope: ScopeResult): { franchiseId?: string } {
    if (scope.isAllLocations) {
        return {}; // No filter needed for providers
    }

    if (scope.franchiseId) {
        return { franchiseId: scope.franchiseId };
    }

    return {};
}
