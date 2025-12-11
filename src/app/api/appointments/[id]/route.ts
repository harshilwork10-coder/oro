import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT: Update appointment
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await req.json()
        const { startTime, endTime, status, notes, employeeId } = body

        const updateData: any = {}

        if (startTime) updateData.startTime = new Date(startTime)
        if (endTime) updateData.endTime = new Date(endTime)
        if (status) updateData.status = status
        if (notes !== undefined) updateData.notes = notes
        if (employeeId) updateData.employeeId = employeeId

        // If rescheduling, check for conflicts
        if (startTime && endTime && employeeId) {
            const existingAppointment = await prisma.appointment.findFirst({
                where: {
                    id: { not: id },
                    employeeId,
                    status: { not: 'CANCELLED' },
                    OR: [
                        {
                            AND: [
                                { startTime: { lte: new Date(startTime) } },
                                { endTime: { gt: new Date(startTime) } },
                            ],
                        },
                        {
                            AND: [
                                { startTime: { lt: new Date(endTime) } },
                                { endTime: { gte: new Date(endTime) } },
                            ],
                        },
                    ],
                },
            })

            if (existingAppointment) {
                return NextResponse.json(
                    { error: 'Time slot already booked for this employee' },
                    { status: 409 }
                )
            }
        }

        const appointment = await prisma.appointment.update({
            where: { id },
            data: updateData,
            include: {
                client: true,
                service: true,
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        return NextResponse.json(appointment)
    } catch (error) {
        console.error('Error updating appointment:', error)
        return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
    }
}

// DELETE: Cancel appointment
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: {
                client: true,
                service: true,
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        return NextResponse.json(appointment)
    } catch (error) {
        console.error('Error cancelling appointment:', error)
        return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 })
    }
}
