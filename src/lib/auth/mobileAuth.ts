/**
 * Mobile/API Auth Helper
 * 
 * Supports both NextAuth session (web) and JWT Bearer token (mobile/API)
 * 
 * SECURITY: JWT tokens are signed with JWT_SECRET (HS256)
 * The Bearer token contains: { userId, franchiseId, locationId, role, exp }
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// SECURITY: JWT secret — prefer dedicated JWT_SECRET, fall back to NEXTAUTH_SECRET
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-fallback-secret'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    // SECURITY WARNING: JWT_SECRET not set — using NEXTAUTH_SECRET as fallback
    console.error(
        '[SECURITY WARNING] JWT_SECRET is not set. Using NEXTAUTH_SECRET as fallback. ' +
        'Set JWT_SECRET in Vercel Environment Variables for best security.'
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
