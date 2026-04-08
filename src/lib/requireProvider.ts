/**
 * Provider Auth Guard — Reusable across all /api/provider/* routes
 * 
 * Returns the authenticated user or null if not a PROVIDER/ADMIN.
 * Usage:
 *   const user = await requireProvider(req)
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'

export async function requireProvider(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return null
    if (user.role !== 'PROVIDER' && user.role !== 'ADMIN') return null
    return user
}

export function unauthorizedResponse() {
    return NextResponse.json({ error: 'Unauthorized — Provider access required' }, { status: 401 })
}
