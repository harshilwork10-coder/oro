/**
 * Display Profile API — Station-level display configuration CRUD
 *
 * GET  ?stationId=X → Load saved display profile
 * PUT  body { stationId, displayMode, ... } → Save/update profile
 * DELETE ?stationId=X → Clear profile (reset to NONE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stationId = request.nextUrl.searchParams.get('stationId')
    if (!stationId) {
        return NextResponse.json({ error: 'stationId required' }, { status: 400 })
    }

    try {
        const profile = await prisma.stationDisplayProfile.findUnique({
            where: { stationId },
        })
        return NextResponse.json({ profile })
    } catch (error) {
        console.error('[display-profile] GET error:', error)
        return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await request.json()
        const { stationId, displayMode, hardwareIdentifier, driver, protocolSettings, fallbackMode, isAutoDetected } = body

        if (!stationId) {
            return NextResponse.json({ error: 'stationId required' }, { status: 400 })
        }

        // Verify station exists
        const station = await prisma.station.findUnique({ where: { id: stationId } })
        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 })
        }

        const profile = await prisma.stationDisplayProfile.upsert({
            where: { stationId },
            create: {
                stationId,
                displayMode: displayMode || 'NONE',
                hardwareIdentifier,
                driver,
                protocolSettings: protocolSettings || undefined,
                fallbackMode: fallbackMode || 'REMOTE_BROWSER',
                isAutoDetected: isAutoDetected || false,
                lastConnectedAt: new Date(),
            },
            update: {
                displayMode: displayMode || 'NONE',
                hardwareIdentifier,
                driver,
                protocolSettings: protocolSettings || undefined,
                fallbackMode: fallbackMode || 'REMOTE_BROWSER',
                isAutoDetected: isAutoDetected || false,
                lastConnectedAt: new Date(),
                lastConnectionError: null,
            },
        })

        return NextResponse.json({ success: true, profile })
    } catch (error) {
        console.error('[display-profile] PUT error:', error)
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stationId = request.nextUrl.searchParams.get('stationId')
    if (!stationId) {
        return NextResponse.json({ error: 'stationId required' }, { status: 400 })
    }

    try {
        await prisma.stationDisplayProfile.deleteMany({ where: { stationId } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[display-profile] DELETE error:', error)
        return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
    }
}
