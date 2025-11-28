import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET: Fetch appointments
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const employeeId = searchParams.get('employeeId')

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
        }

        const where: any = {
            locationId,
        }

        // Filter by date range
        if (startDate && endDate) {
            where.startTime = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            }
        }

        // Filter by employee
        if (employeeId) {
            where.employeeId = employeeId
        }

        const appointments = await prisma.appointment.findMany({
            where,
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
            orderBy: {
                startTime: 'asc',
            },
        })

        return NextResponse.json(appointments)
    } catch (error) {
        console.error('Error fetching appointments:', error)
        return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }
}

// POST: Create new appointment
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { clientId, serviceId, employeeId, locationId, startTime, endTime, notes } = body

        // Validate required fields
        if (!clientId || !serviceId || !employeeId || !locationId || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check for time conflicts
        const existingAppointment = await prisma.appointment.findFirst({
            where: {
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
                    {
                        AND: [
                            { startTime: { gte: new Date(startTime) } },
                            { endTime: { lte: new Date(endTime) } },
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

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                clientId,
                serviceId,
                employeeId,
                locationId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                notes: notes || null,
                status: 'SCHEDULED',
            },
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

        return NextResponse.json(appointment, { status: 201 })
    } catch (error) {
        console.error('Error creating appointment:', error)
        return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }
}
