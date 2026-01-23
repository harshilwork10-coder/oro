/**
 * POS Staff API
 * 
 * GET /api/pos/staff
 * 
 * Returns staff list for POS display.
 * Uses withPOSAuth() wrapper - station scope from validated token ONLY.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

/**
 * GET /api/pos/staff
 * 
 * Protected by withPOSAuth - requires X-Station-Token header
 * franchiseId comes from validated token, NEVER from client
 */
export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    // SECURITY: franchiseId from validated token only
    const { franchiseId } = ctx

    try {
        // Fetch all staff (employees) for this franchise
        const staff = await prisma.user.findMany({
            where: {
                franchiseId,
                isActive: true,
                role: { in: ['EMPLOYEE', 'OWNER', 'MANAGER'] }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true
            },
            orderBy: { name: 'asc' }
        })

        // Color palette for staff (cycles through)
        const colors = ['#EA580C', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B']

        // Transform to include initials and colors for Android display
        const staffFormatted = staff.map((s, index) => ({
            id: s.id,
            name: s.name || s.email?.split('@')[0] || 'Unknown',
            email: s.email,
            role: s.role,
            color: colors[index % colors.length],
            initials: (s.name || s.email?.split('@')[0] || '??')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2),
            image: s.image
        }))

        return NextResponse.json({
            success: true,
            data: staffFormatted
        })
    } catch (error) {
        console.error('[API_STAFF_ERROR]', error)
        return NextResponse.json({ error: 'Failed to load staff' }, { status: 500 })
    }
})
