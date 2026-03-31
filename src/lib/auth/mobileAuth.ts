/**
 * Mobile/API Auth Helper
 * 
 * Supports both NextAuth session (web) and JWT Bearer token (mobile/API)
 * 
 * SECURITY: JWT tokens are signed with JWT_SECRET (HS256)
 * The Bearer token contains: { userId, franchiseId, locationId, role, exp }
 * 
 * ═══════════════════════════════════════════════════════════════════
 * SOURCE OF TRUTH — ROLE SYSTEM
 * ═══════════════════════════════════════════════════════════════════
 * The CANONICAL role system is `User.role` (string field on the User model).
 * All role checks in middleware and API routes use: user.role === 'ROLE_NAME'
 * 
 * The `UserRoleAssignment` RBAC table exists in schema but is Phase 2 —
 * it is NOT enforced at middleware or API level. Do not rely on it for
 * access control decisions until the RBAC migration is complete.
 * 
 * Valid roles: PROVIDER, ADMIN, FRANCHISOR, FRANCHISEE, OWNER, MANAGER,
 *              SHIFT_SUPERVISOR, EMPLOYEE, SUB_FRANCHISEE
 * 
 * ═══════════════════════════════════════════════════════════════════
 * SOURCE OF TRUTH — PERMISSION SYSTEM
 * ═══════════════════════════════════════════════════════════════════
 * The CANONICAL permission system is boolean fields on the User model:
 *   canProcessRefunds, canAddServices, canManageInventory,
 *   canManageSchedule, canManageEmployees, canManageShifts,
 *   canClockIn, canClockOut
 * 
 * These are checked directly in API routes (e.g., pos/refund, pos/void).
 * 
 * The `Permission` / `UserPermission` normalized tables exist in schema
 * but have ZERO runtime consumers. The `customPermissions` JSON field
 * on User is deprecated and not checked anywhere.
 * Do not add new code that reads from UserPermission or customPermissions.
 * ═══════════════════════════════════════════════════════════════════
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// SECURITY: JWT secret must be set in production
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_' + process.env.NEXTAUTH_SECRET?.slice(0, 16)

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    // GO-LIVE GATE: Hard block — do NOT start with weak token signing
    throw new Error(
        '[FATAL SECURITY] JWT_SECRET environment variable is not set in production. ' +
        'The application cannot start. Set JWT_SECRET in your deployment configuration.'
    )
}


export interface AuthUser {
    id: string
    email?: string
    name?: string
    role: string
    franchiseId: string
    locationId?: string
}

interface JWTPayload {
    userId: string
    franchiseId: string
    locationId?: string
    role: string
    exp?: number
    iat?: number
}

/**
 * Get authenticated user from either session or JWT Bearer token
 * Returns null if not authenticated
 */
export async function getAuthUser(request?: NextRequest | Request): Promise<AuthUser | null> {
    // Try NextAuth session first (web)
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
        // PROVIDER and ADMIN users operate above the franchise hierarchy — they have no franchiseId
        const role = session.user.role ?? 'EMPLOYEE'
        const isSystemRole = role === 'PROVIDER' || role === 'ADMIN'
        
        if (isSystemRole || session.user.franchiseId) {
            return {
                id: session.user.id,
                email: session.user.email ?? undefined,
                name: session.user.name ?? undefined,
                role,
                franchiseId: session.user.franchiseId ?? (isSystemRole ? '__SYSTEM__' : ''),
                locationId: session.user.locationId ?? undefined
            }
        }
    }

    // Try JWT Bearer token (mobile/API)
    if (request) {
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            try {
                // SECURITY: Verify JWT signature and expiration
                const payload = jwt.verify(token, JWT_SECRET) as JWTPayload

                // Validate required fields
                if (!payload.userId || !payload.franchiseId) {
                    console.error('[AUTH] Token missing required fields')
                    return null
                }

                // Verify user still exists and is active
                const user = await prisma.user.findUnique({
                    where: { id: payload.userId },
                    select: { id: true, email: true, name: true, role: true, franchiseId: true, locationId: true, isActive: true }
                })

                if (!user || !user.isActive) {
                    console.error('[AUTH] User not found or inactive:', payload.userId)
                    return null
                }

                // SECURITY: Verify franchiseId hasn't changed
                if (user.franchiseId !== payload.franchiseId) {
                    console.error('[AUTH] Token franchiseId mismatch - potential security issue')
                    return null
                }

                return {
                    id: user.id,
                    email: user.email ?? undefined,
                    name: user.name ?? undefined,
                    role: user.role ?? 'EMPLOYEE',
                    franchiseId: user.franchiseId!,
                    locationId: user.locationId ?? undefined
                }
            } catch (e: any) {
                if (e.name === 'TokenExpiredError') {
                    console.error('[AUTH] JWT token expired')
                } else if (e.name === 'JsonWebTokenError') {
                    console.error('[AUTH] Invalid JWT signature - possible forgery attempt')
                } else {
                    console.error('[AUTH] Failed to verify JWT token:', e.message)
                }
                return null
            }
        }
    }

    return null
}

/**
 * Require authentication - returns user or throws
 */
export async function requireAuth(request?: NextRequest | Request): Promise<AuthUser> {
    const user = await getAuthUser(request)
    if (!user) {
        throw new Error('Unauthorized')
    }
    return user
}
