import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET — list all locations across all franchises (provider-level view)
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Provider sees all, franchise users see only their own
        const where = ['PROVIDER', 'ADMIN'].includes(user.role)
            ? {}
            : user.franchiseId && user.franchiseId !== '__SYSTEM__'
                ? { franchiseId: user.franchiseId }
                : { id: '__NONE__' } // No access if no franchise

        const locations = await prisma.location.findMany({
            where,
            select: {
                id: true,
                name: true,
                address: true,
                slug: true,
                franchise: {
                    select: {
                        id: true,
                        name: true,
                        franchisorId: true,
                    }
                }
            },
            orderBy: { name: 'asc' },
            take: 200
        })

        return NextResponse.json(locations)
    } catch (error) {
        console.error('[FRANCHISES_LOCATIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}
