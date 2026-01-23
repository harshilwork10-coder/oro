/**
 * Time Clock Status API
 * 
 * GET: Check if employee is currently clocked in
 * Returns active session info if clocked in
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')

        // Find any OPEN time entry for this user
        const activeSession = await prisma.timeEntry.findFirst({
            where: {
                userId: user.id,
                status: 'OPEN',
                clockOut: null
            },
            orderBy: { clockIn: 'desc' }
        })

        if (activeSession) {
            // Check if clocked in at a different location
            const isDifferentLocation = locationId && activeSession.locationId !== locationId

            return NextResponse.json({
                isClockedIn: true,
                activeSessionId: activeSession.id,
                clockInAt: activeSession.clockIn.toISOString(),
                locationId: activeSession.locationId,
                isDifferentLocation,
                message: isDifferentLocation
                    ? `You are clocked in at another location. Ask a manager to transfer or clock out.`
                    : undefined
            })
        }

        return NextResponse.json({
            isClockedIn: false,
            activeSessionId: null,
            clockInAt: null
        })

    } catch (error) {
        console.error('[TIMECLOCK_STATUS]', error)
        return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
    }
}
