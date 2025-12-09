import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendBookingCancelledSMS } from '@/lib/sms'

// PATCH - Cancel an appointment (staff initiated)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { reason } = body

        // Get the appointment with full details
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                client: true,
                service: true,
                location: {
                    include: { franchise: true }
                }
            }
        })

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        if (appointment.status === 'CANCELLED') {
            return NextResponse.json({ error: 'Appointment already cancelled' }, { status: 400 })
        }

        // Update status to cancelled
        const updated = await prisma.appointment.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                notes: reason ? `${appointment.notes || ''}\n[Cancelled: ${reason}]` : appointment.notes,
                updatedAt: new Date()
            },
            include: {
                client: true,
                service: true,
                location: {
                    include: { franchise: true }
                }
            }
        })

        // Send SMS notification to customer
        const startTime = new Date(updated.startTime)
        if (updated.client.phone) {
            await sendBookingCancelledSMS(
                updated.client.phone,
                updated.location.franchiseId,
                {
                    customerName: `${updated.client.firstName} ${updated.client.lastName}`,
                    businessName: updated.location.franchise.name,
                    serviceName: updated.service.name,
                    date: startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Appointment cancelled',
            smsSent: !!updated.client.phone,
            appointment: updated
        })
    } catch (error) {
        console.error('Error cancelling appointment:', error)
        return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 })
    }
}
