/**
 * Time Clock Clock-Out API
 * 
 * POST: Clock out an employee - closes their active time entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const { notes } = body

        // Find active session
        const activeSession = await prisma.timeEntry.findFirst({
            where: {
                userId: user.id,
                status: 'OPEN',
                clockOut: null
            }
        })

        if (!activeSession) {
            return NextResponse.json({
                error: 'No active clock-in session found',
                isClockedIn: false
            }, { status: 400 })
        }

        // Calculate total hours
        const clockOut = new Date()
        const clockIn = new Date(activeSession.clockIn)
        const totalMs = clockOut.getTime() - clockIn.getTime()
        const totalHours = (totalMs / (1000 * 60 * 60)) - (activeSession.breakDuration / 60)

        // Update the session
        const closedSession = await prisma.timeEntry.update({
            where: { id: activeSession.id },
            data: {
                clockOut,
                status: 'CLOSED',
                totalHours: new Decimal(Math.max(0, totalHours).toFixed(2))
            }
        })

        return NextResponse.json({
            success: true,
            session: closedSession,
            message: 'Clocked out successfully',
            summary: {
                clockIn: clockIn.toISOString(),
                clockOut: clockOut.toISOString(),
                totalHours: totalHours.toFixed(2),
                breakMinutes: activeSession.breakDuration
            }
        })

    } catch (error) {
        console.error('[TIMECLOCK_CLOCKOUT]', error)
        return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 })
    }
}
