import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH: Start service for an appointment
// PATCH: Start service for an appointment
export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
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

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error starting service:', error)
        return NextResponse.json({ error: 'Failed to start service' }, { status: 500 })
    }
}
