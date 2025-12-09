import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendBookingApprovedSMS, sendBookingRejectedSMS } from '@/lib/sms'

// PATCH - Approve or Reject a pending appointment
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
        const { action } = body // 'approve' | 'reject'

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject"' }, { status: 400 })
        }

        // Get the appointment with location's franchise
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                client: true,
                service: true,
                location: {
                    include: {
                        franchise: true
                    }
                }
            }
        })

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        if (appointment.status !== 'PENDING_APPROVAL') {
            return NextResponse.json({ error: 'Appointment is not pending approval' }, { status: 400 })
        }

        // Update the appointment status
        const newStatus = action === 'approve' ? 'SCHEDULED' : 'CANCELLED'
        const updated = await prisma.appointment.update({
            where: { id },
            data: {
                status: newStatus,
                updatedAt: new Date()
            },
            include: {
                client: true,
                service: true,
                employee: { select: { name: true } },
                location: {
                    include: { franchise: true }
                }
            }
        })

        // Send SMS notification to customer
        const franchiseId = updated.location.franchiseId
        const startTime = new Date(updated.startTime)
        const smsData = {
            customerName: `${updated.client.firstName} ${updated.client.lastName}`,
            businessName: updated.location.franchise.name,
            serviceName: updated.service.name,
            date: startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        }

        // Send SMS if customer has phone
        if (updated.client.phone) {
            if (action === 'approve') {
                await sendBookingApprovedSMS(updated.client.phone, franchiseId, smsData)
            } else {
                await sendBookingRejectedSMS(updated.client.phone, franchiseId, smsData)
            }
        }

        return NextResponse.json({
            success: true,
            message: action === 'approve' ? 'Appointment approved' : 'Appointment rejected',
            smsSent: !!updated.client.phone,
            appointment: updated
        })
    } catch (error) {
        console.error('Error updating appointment:', error)
        return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
    }
}
