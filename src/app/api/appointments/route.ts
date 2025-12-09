import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET: Fetch appointments
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's franchise/location
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { franchiseId: true, locationId: true }
        })

        const { searchParams } = new URL(req.url)
        let locationId = searchParams.get('locationId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const employeeId = searchParams.get('employeeId')

        // Build where clause
        const where: any = {}

        // If no locationId provided, get appointments for user's franchise
        if (locationId) {
            where.locationId = locationId
        } else if (user?.franchiseId) {
            // Get all locations for this franchise
            const locations = await prisma.location.findMany({
                where: { franchiseId: user.franchiseId },
                select: { id: true }
            })
            where.locationId = { in: locations.map(l => l.id) }
        } else {
            return NextResponse.json([])
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
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { clientId, serviceId, employeeId, locationId, startTime, endTime, notes } = body

        // Validate required fields
        if (!clientId || !serviceId || !employeeId || !locationId || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Security: Verify location belongs to user's franchise
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        if (location.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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
