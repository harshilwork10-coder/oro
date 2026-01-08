import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { Role } from '@/lib/permissions'

/**
 * API Authorization & Utilities
 * Provides consistent role-based access control, rate limiting, and response formatting
 */

// ============ TYPES ============

export interface AuthResult {
    authorized: boolean
    session: Awaited<ReturnType<typeof getServerSession>> | null
    error?: NextResponse
    userId?: string
    role?: Role
    franchiseId?: string
    locationId?: string
}

export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: {
        code: string
        message: string
        details?: unknown
    }
    meta?: {
        timestamp: string
        requestId?: string
    }
}

// ============ RATE LIMITING ============

// Simple in-memory rate limiter (for single-instance deployments)
// For production with multiple instances, use Redis
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

interface RateLimitConfig {
    windowMs: number  // Time window in milliseconds
    maxRequests: number  // Max requests per window
}

const RATE_LIMIT_DEFAULTS: Record<string, RateLimitConfig> = {
    auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },      // 10 requests per 15 min
    sensitive: { windowMs: 60 * 1000, maxRequests: 30 },       // 30 requests per minute
    standard: { windowMs: 60 * 1000, maxRequests: 100 },       // 100 requests per minute
}

/**
 * Check rate limit for an identifier (usually IP or user ID)
 */
export function checkRateLimit(
    identifier: string,
    type: 'auth' | 'sensitive' | 'standard' = 'standard'
): { allowed: boolean; remaining: number; resetIn: number } {
    const config = RATE_LIMIT_DEFAULTS[type]
    const now = Date.now()
    const key = `${type}:${identifier}`

    const record = rateLimitStore.get(key)

    if (!record || record.resetAt < now) {
        // New window
        rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
        return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
    }

    if (record.count >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetIn: record.resetAt - now }
    }

    record.count++
    return { allowed: true, remaining: config.maxRequests - record.count, resetIn: record.resetAt - now }
}

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown'
}

/**
 * Rate limit middleware - returns error response if limit exceeded
 */
export function rateLimitMiddleware(
    request: NextRequest,
    type: 'auth' | 'sensitive' | 'standard' = 'standard'
): NextResponse | null {
    const ip = getClientIp(request)
    const { allowed, remaining, resetIn } = checkRateLimit(ip, type)

    if (!allowed) {
        return NextResponse.json(
            apiError('RATE_LIMITED', `Too many requests. Try again in ${Math.ceil(resetIn / 1000)} seconds.`),
            {
                status: 429,
                headers: {
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
                    'Retry-After': String(Math.ceil(resetIn / 1000))
                }
            }
        )
    }

    return null // No error, continue processing
}

// ============ STANDARDIZED RESPONSES ============

/**
 * Create a successful API response
 */
export function apiSuccess<T>(data: T, meta?: Partial<ApiResponse['meta']>): ApiResponse<T> {
    return {
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta
        }
    }
}

/**
 * Create an error API response
 */
export function apiError(
    code: string,
    message: string,
    details?: unknown
): ApiResponse {
    return {
        success: false,
        error: {
            code,
            message,
            details
        },
        meta: {
            timestamp: new Date().toISOString()
        }
    }
}

/**
 * Common error responses
 */
export const ApiErrors = {
    unauthorized: () => NextResponse.json(
        apiError('UNAUTHORIZED', 'Please log in to continue'),
        { status: 401 }
    ),
    forbidden: () => NextResponse.json(
        apiError('FORBIDDEN', 'You do not have permission for this action'),
        { status: 403 }
    ),
    notFound: (resource = 'Resource') => NextResponse.json(
        apiError('NOT_FOUND', `${resource} not found`),
        { status: 404 }
    ),
    badRequest: (message: string) => NextResponse.json(
        apiError('BAD_REQUEST', message),
        { status: 400 }
    ),
    serverError: (message = 'Internal server error') => NextResponse.json(
        apiError('SERVER_ERROR', message),
        { status: 500 }
    ),
}

// ============ AUTH HELPERS ============

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
            error: ApiErrors.unauthorized()
        }
    }

    const userRole = session.user.role as Role

    // Role not allowed
    if (!allowedRoles.includes(userRole)) {
        return {
            authorized: false,
            session,
            error: ApiErrors.forbidden()
        }
    }

    // Authorized
    return {
        authorized: true,
        session,
        userId: session.user.id,
        role: userRole,
        franchiseId: session.user.franchiseId ?? undefined,
        locationId: session.user.locationId ?? undefined
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
            error: ApiErrors.unauthorized()
        }
    }

    return {
        authorized: true,
        session,
        userId: session.user.id,
        role: session.user.role as Role,
        franchiseId: session.user.franchiseId ?? undefined,
        locationId: session.user.locationId ?? undefined
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
            error: ApiErrors.forbidden()
        }
    }

    return auth
}

// ============ CONVENIENCE HELPERS ============

/**
 * Require PROVIDER role (platform admin)
 */
export async function requireProvider(): Promise<AuthResult> {
    return requireRole([Role.PROVIDER])
}

/**
 * Require FRANCHISOR or PROVIDER role
 */
export async function requireFranchisor(): Promise<AuthResult> {
    return requireRole([Role.PROVIDER, Role.FRANCHISOR])
}

/**
 * Require FRANCHISEE (owner) or above
 */
export async function requireOwner(): Promise<AuthResult> {
    return requireRole([Role.PROVIDER, Role.FRANCHISOR, Role.FRANCHISEE])
}

/**
 * Require at least EMPLOYEE role (most routes)
 */
export async function requireEmployee(): Promise<AuthResult> {
    return requireRole([Role.PROVIDER, Role.FRANCHISOR, Role.FRANCHISEE, Role.EMPLOYEE])
}

// ============ WRAP HANDLER ============

/**
 * Wrap an API handler with auth and error handling
 * Usage:
 *   export const GET = withAuth(['PROVIDER', 'FRANCHISOR'], async (req, auth) => {
 *     return NextResponse.json(apiSuccess({ data }))
 *   })
 */
export function withAuth<T>(
    allowedRoles: Role[],
    handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse<T>>
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        try {
            const auth = await requireRole(allowedRoles)

            if (!auth.authorized) {
                return auth.error!
            }

            return await handler(request, auth)
        } catch (error) {
            console.error('API Error:', error)
            return ApiErrors.serverError()
        }
    }
}

/**
 * Wrap handler with auth AND rate limiting
 */
export function withAuthAndRateLimit<T>(
    allowedRoles: Role[],
    rateLimitType: 'auth' | 'sensitive' | 'standard',
    handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse<T>>
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        // Check rate limit first
        const rateLimitError = rateLimitMiddleware(request, rateLimitType)
        if (rateLimitError) return rateLimitError

        try {
            const auth = await requireRole(allowedRoles)

            if (!auth.authorized) {
                return auth.error!
            }

            return await handler(request, auth)
        } catch (error) {
            console.error('API Error:', error)
            return ApiErrors.serverError()
        }
    }
}
