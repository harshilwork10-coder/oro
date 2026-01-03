import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { Role } from '@/lib/permissions'

/**
 * API Authorization Helper
 * Provides consistent role-based access control for API routes
 */

export interface AuthResult {
    authorized: boolean
    session: Awaited<ReturnType<typeof getServerSession>> | null
    error?: NextResponse
    userId?: string
    role?: Role
    franchiseId?: string
}

/**
 * Check if user is authenticated and has one of the allowed roles
 * Returns unauthorized response if not allowed
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthResult> {
    const session = await getServerSession(authOptions)

    // Not authenticated
    if (!session || !session.user) {
        return {
            authorized: false,
            session: null,
            error: NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            )
        }
    }

    const userRole = session.user.role as Role

    // Role not allowed
    if (!allowedRoles.includes(userRole)) {
        return {
            authorized: false,
            session,
            error: NextResponse.json(
                { error: 'Forbidden - You do not have permission for this action' },
                { status: 403 }
            )
        }
    }

    // Authorized
    return {
        authorized: true,
        session,
        userId: session.user.id,
        role: userRole,
        franchiseId: session.user.franchiseId ?? undefined
    }
}

/**
 * Check if user is authenticated (any role)
 */
export async function requireAuth(): Promise<AuthResult> {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        return {
            authorized: false,
            session: null,
            error: NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            )
        }
    }

    return {
        authorized: true,
        session,
        userId: session.user.id,
        role: session.user.role as Role,
        franchiseId: session.user.franchiseId ?? undefined
    }
}

/**
 * Check if user owns or has access to a specific resource
 */
export async function requireOwnership(
    resourceFranchiseId: string | null | undefined
): Promise<AuthResult> {
    const auth = await requireAuth()

    if (!auth.authorized) {
        return auth
    }

    const userRole = auth.role

    // PROVIDER can access everything (platform owner)
    if (userRole === Role.PROVIDER) {
        return auth
    }

    // FRANCHISOR can access their own and franchisees' data
    if (userRole === Role.FRANCHISOR) {
        return auth
    }

    // For other roles, check franchise ownership
    if (resourceFranchiseId && auth.franchiseId !== resourceFranchiseId) {
        return {
            authorized: false,
            session: auth.session,
            error: NextResponse.json(
                { error: 'Forbidden - You do not have access to this resource' },
                { status: 403 }
            )
        }
    }

    return auth
}

