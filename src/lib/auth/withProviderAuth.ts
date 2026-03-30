import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, AuthUser } from '@/lib/auth/mobileAuth'

/**
 * withProviderAuth — Shared auth wrapper for Provider/Admin API routes.
 *
 * Guarantees:
 * 1. User is authenticated (getAuthUser)
 * 2. User has PROVIDER or ADMIN role
 * 3. All errors return valid JSON (never HTML, never empty body)
 * 4. Automatic try/catch with structured error logging
 * 5. No franchiseId gate (provider routes operate above franchise hierarchy)
 *
 * Usage:
 *   export const GET = withProviderAuth(async (req, user) => {
 *       const data = await prisma.something.findMany()
 *       return NextResponse.json(data)
 *   })
 */
export function withProviderAuth(
    handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
    return async (req: NextRequest) => {
        try {
            const user = await getAuthUser(req)
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            if (!['PROVIDER', 'ADMIN'].includes(user.role)) {
                return NextResponse.json(
                    { error: 'Insufficient permissions — PROVIDER or ADMIN role required' },
                    { status: 403 }
                )
            }
            return await handler(req, user)
        } catch (error: any) {
            const path = req.nextUrl?.pathname || req.url || 'unknown'
            console.error(`[PROVIDER_API] ${req.method} ${path}`, error)
            return NextResponse.json(
                { error: error.message || 'Internal server error' },
                { status: 500 }
            )
        }
    }
}
