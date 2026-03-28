/**
 * Time Clock Clock-In API
 * 
 * POST: Clock in an employee (idempotent - returns existing session if already clocked in)
 */

import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { locationId, stationId, notes } = body

        if (!locationId) {
            return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
        }

        // Check for existing OPEN session (anywhere)
        const existingSession = await prisma.timeEntry.findFirst({
            where: {
                userId: user.id,
                status: 'OPEN',
                clockOut: null
            }
        })

        // If already clocked in at THIS location - return existing (idempotent)
        if (existingSession && existingSession.locationId === locationId) {
            return NextResponse.json({
                success: true,
                session: existingSession,
                message: 'Already clocked in',
                alreadyClockedIn: true
            })
        }

        // If clocked in at DIFFERENT location - block
        if (existingSession && existingSession.locationId !== locationId) {
            const location = await prisma.location.findUnique({
                where: { id: existingSession.locationId },
                select: { name: true }
            })

            return NextResponse.json({
                error: `Already clocked in at ${location?.name || 'another location'}`,
                existingLocationId: existingSession.locationId,
                existingLocationName: location?.name,
                actionRequired: 'CLOCK_OUT_FIRST'
            }, { status: 409 }) // Conflict
        }

        // Create new time entry
        const newSession = await prisma.timeEntry.create({
            data: {
                userId: user.id,
                locationId,
                clockIn: new Date(),
                status: 'OPEN',
                breakDuration: 0
            }
        })

        // Audit log
        await auditLog({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'CLOCK_IN',
            entityType: 'TimeEntry',
            entityId: newSession.id,
            franchiseId: user.franchiseId,
            locationId,
        })

        return NextResponse.json({
            success: true,
            session: newSession,
            message: 'Clocked in successfully',
            alreadyClockedIn: false
        })

    } catch (error) {
        console.error('[TIMECLOCK_CLOCKIN]', error)
        return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 })
    }
}
