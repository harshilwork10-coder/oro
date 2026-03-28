/**
 * Appointment Status Update API
 * PATCH /api/pos/appointments/[id]/status
 * 
 * Updates appointment status: CHECKED_IN, IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED
 * Used by Android salon app for appointment lifecycle management.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED']

// Valid transitions: prevent illegal status jumps
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'SCHEDULED':   ['CHECKED_IN', 'IN_PROGRESS', 'NO_SHOW', 'CANCELLED'],
    'CONFIRMED':   ['CHECKED_IN', 'IN_PROGRESS', 'NO_SHOW', 'CANCELLED'],
    'CHECKED_IN':  ['IN_PROGRESS', 'NO_SHOW', 'CANCELLED'],
    'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
    'COMPLETED':   [], // terminal
    'NO_SHOW':     ['SCHEDULED'], // allow re-scheduling a no-show
    'CANCELLED':   ['SCHEDULED'], // allow re-opening a cancelled appointment
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appointmentId = params.id

    try {
        const body = await req.json()
        const { status } = body

        if (!status || !VALID_STATUSES.includes(status)) {
            return NextResponse.json({
                success: false,
                error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            }, { status: 400 })
        }

        // Get the appointment and verify it belongs to this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        const appointment = await prisma.appointment.findFirst({
            where: {
                id: appointmentId,
                locationId: { in: locationIds }
            }
        })

        if (!appointment) {
            return NextResponse.json({
                success: false,
                error: 'Appointment not found'
            }, { status: 404 })
        }

        // Validate status transition
        const allowed = ALLOWED_TRANSITIONS[appointment.status] || []
        if (!allowed.includes(status)) {
            return NextResponse.json({
                success: false,
                error: `Cannot transition from ${appointment.status} to ${status}`
            }, { status: 400 })
        }

        // Update the appointment status
        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status }
        })

        console.log(`[APPOINTMENT_STATUS] ${appointmentId}: ${appointment.status} → ${status} by ${user.id}`)

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                status: updated.status,
                previousStatus: appointment.status
            }
        })
    } catch (error) {
        console.error('[APPOINTMENT_STATUS_ERROR]', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to update appointment status'
        }, { status: 500 })
    }
}
