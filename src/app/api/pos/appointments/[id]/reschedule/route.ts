/**
 * Appointment Reschedule API
 * PATCH /api/pos/appointments/[id]/reschedule
 * 
 * Updates appointment time (and optionally service/stylist).
 * Used by Android salon app for rescheduling appointments.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

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
        const { startTime, serviceId, employeeId, notes } = body

        if (!startTime) {
            return NextResponse.json({
                success: false,
                error: 'startTime is required'
            }, { status: 400 })
        }

        // Verify appointment belongs to this franchise
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

        // Can only reschedule SCHEDULED, CONFIRMED, or NO_SHOW appointments
        if (!['SCHEDULED', 'CONFIRMED', 'NO_SHOW', 'CANCELLED'].includes(appointment.status)) {
            return NextResponse.json({
                success: false,
                error: `Cannot reschedule ${appointment.status} appointment`
            }, { status: 400 })
        }

        // Calculate new times
        const newStartMs = typeof startTime === 'string' ? new Date(startTime).getTime() : Number(startTime)
        const newStart = new Date(newStartMs)

        // Get service duration for end time calculation
        const svcId = serviceId || appointment.serviceId
        const service = await prisma.service.findUnique({
            where: { id: svcId },
            select: { duration: true }
        })
        const durationMs = (service?.duration || 30) * 60 * 1000
        const newEnd = new Date(newStartMs + durationMs)

        // Build update data
        const updateData: any = {
            startTime: newStart,
            endTime: newEnd,
            status: 'CONFIRMED' // Re-scheduling resets status to confirmed
        }

        if (serviceId) updateData.serviceId = serviceId
        if (employeeId) updateData.employeeId = employeeId
        if (notes !== undefined) updateData.notes = notes

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: updateData,
            include: {
                client: { select: { firstName: true, lastName: true, phone: true } },
                employee: { select: { name: true } },
                service: { select: { name: true } }
            }
        })

        console.log(`[APPOINTMENT_RESCHEDULE] ${appointmentId}: rescheduled to ${newStart.toISOString()} by ${user.id}`)

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                customerName: updated.client ? `${updated.client.firstName} ${updated.client.lastName || ''}`.trim() : 'Walk-in',
                customerPhone: updated.client?.phone || null,
                stylistName: updated.employee?.name || null,
                startTime: updated.startTime.getTime(),
                endTime: updated.endTime?.getTime() || null,
                services: updated.service ? [updated.service.name] : [],
                status: updated.status,
                notes: updated.notes
            }
        })
    } catch (error) {
        console.error('[APPOINTMENT_RESCHEDULE_ERROR]', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to reschedule appointment'
        }, { status: 500 })
    }
}
