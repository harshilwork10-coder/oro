import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

// PATCH: Start service for an appointment
// PATCH: Start service for an appointment
export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

        // Update appointment status to IN_PROGRESS
        const updated = await prisma.appointment.update({
            where: { id: params.id },
            data: {
                status: 'IN_PROGRESS'
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
            action: 'APPOINTMENT_STARTED',
            entityType: 'Appointment',
            entityId: params.id,
            metadata: {}
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error starting service:', error)
        return NextResponse.json({ error: 'Failed to start service' }, { status: 500 })
    }
}
