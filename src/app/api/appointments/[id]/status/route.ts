import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const statusSchema = z.object({
    status: z.enum(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
})

// PATCH /api/appointments/[id]/status - Update appointment status
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { status } = statusSchema.parse(body)
        const appointmentId = params.id

        // Verify the appointment belongs to this franchise via location
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                location: {
                    select: { franchiseId: true }
                }
            }
        })

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        if (appointment.location?.franchiseId !== session.user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Update the appointment status
        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status },
            include: {
                client: {
                    select: { firstName: true, lastName: true }
                },
                employee: {
                    select: { name: true }
                },
                service: {
                    select: { name: true, duration: true }
                }
            }
        })

        return NextResponse.json({
            id: updated.id,
            status: updated.status,
            clientName: `${updated.client?.firstName || ''} ${updated.client?.lastName || ''}`.trim() || 'Walk-in',
            employeeName: updated.employee?.name,
            serviceName: updated.service?.name,
            startTime: updated.startTime,
            endTime: updated.endTime
        })

    } catch (error) {
        console.error('[APPOINTMENT_STATUS_PATCH] Error:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
    }
}
