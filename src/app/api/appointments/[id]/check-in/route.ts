import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

// PATCH: Check in a client for their appointment
export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const params = await props.params;
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const appointment = await prisma.appointment.findUnique({
            where: { id: params.id }
        })

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        // Update appointment status to CHECKED_IN
        const updated = await prisma.appointment.update({
            where: { id: params.id },
            data: {
                status: 'CHECKED_IN'
            },
            include: {
                client: true,
                service: true,
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'USER',
            action: 'APPOINTMENT_CHECKED_IN',
            entityType: 'Appointment',
            entityId: params.id,
            metadata: {}
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error checking in appointment:', error)
        return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
    }
}
