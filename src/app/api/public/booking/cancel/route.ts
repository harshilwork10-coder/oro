import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Generate a cancel token from appointment ID + secret
export function generateCancelToken(appointmentId: string): string {
    const secret = process.env.NEXTAUTH_SECRET || 'oro9-salon-cancel-secret'
    return crypto.createHmac('sha256', secret).update(appointmentId).digest('hex').substring(0, 32)
}

// GET /api/public/booking/cancel?id=xxx&token=xxx - Cancel a booking via public link
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const appointmentId = searchParams.get('id')
        const token = searchParams.get('token')

        if (!appointmentId || !token) {
            return NextResponse.json({ error: 'Missing appointment ID or cancel token' }, { status: 400 })
        }

        // Verify cancel token
        const expectedToken = generateCancelToken(appointmentId)
        if (token !== expectedToken) {
            return NextResponse.json({ error: 'Invalid cancel link' }, { status: 403 })
        }

        // Find the appointment
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                service: { select: { name: true } },
                employee: { select: { name: true } },
                location: { select: { name: true } },
                client: { select: { firstName: true, lastName: true } }
            }
        })

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        if (appointment.status === 'CANCELLED') {
            return NextResponse.json({
                success: true,
                alreadyCancelled: true,
                message: 'This appointment was already cancelled.'
            })
        }

        if (appointment.status === 'COMPLETED') {
            return NextResponse.json({
                error: 'Cannot cancel a completed appointment'
            }, { status: 400 })
        }

        // Cancel the appointment
        await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'CANCELLED' }
        })

        return NextResponse.json({
            success: true,
            message: 'Appointment cancelled successfully.',
            appointment: {
                service: appointment.service.name,
                staff: appointment.employee.name,
                location: appointment.location.name,
                date: appointment.startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
                time: appointment.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                customer: `${appointment.client.firstName} ${appointment.client.lastName}`
            }
        })
    } catch (error) {
        console.error('[BOOKING_CANCEL] Error:', error)
        return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
    }
}
