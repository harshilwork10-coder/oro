import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // PROVIDER sees all locations, others see only their franchise's
        const where = user.role === 'PROVIDER'
            ? {}
            : user.franchiseId
                ? { franchiseId: user.franchiseId }
                : {}

        const locations = await prisma.location.findMany({
            where,
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ locations })
    } catch (error) {
        console.error('[FRANCHISE_LOCATIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}
