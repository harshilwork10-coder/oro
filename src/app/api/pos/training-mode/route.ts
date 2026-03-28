import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Training Mode — Toggle training mode for a POS station
 * POST /api/pos/training-mode (Manager+ only)
 * GET /api/pos/training-mode?stationId=xxx
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
    }

    try {
        const { stationId, enabled } = await req.json()
        if (!stationId) return NextResponse.json({ error: 'stationId required' }, { status: 400 })

        await prisma.station.update({
            where: { id: stationId },
            data: { trainingMode: enabled ?? false }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'TRAINING_MODE_TOGGLED', entityType: 'Station', entityId: stationId,
            details: { trainingMode: enabled ?? false }
        })

        return NextResponse.json({ stationId, trainingMode: enabled })
    } catch (error: any) {
        console.error('[TRAINING_MODE_POST]', error)
        return NextResponse.json({ error: 'Failed to toggle training mode' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const stationId = searchParams.get('stationId')
    if (!stationId) return NextResponse.json({ error: 'stationId required' }, { status: 400 })

    try {
        const station = await prisma.station.findUnique({
            where: { id: stationId },
            select: { trainingMode: true, name: true }
        })

        return NextResponse.json({
            stationId, name: station?.name,
            trainingMode: station?.trainingMode || false
        })
    } catch (error: any) {
        console.error('[TRAINING_MODE_GET]', error)
        return NextResponse.json({ error: 'Failed to check training mode' }, { status: 500 })
    }
}
