import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List recurring appointments for a location
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const locationId = user.locationId
        const { searchParams } = new URL(request.url)
        const clientId = searchParams.get('clientId')

        if (!locationId) {
            return NextResponse.json({ error: 'No location associated' }, { status: 400 })
        }

        const recurring = await prisma.recurringAppointment.findMany({
            where: {
                locationId,
                isActive: true,
                ...(clientId && { clientId })
            },
            include: {
                client: { select: { id: true, firstName: true, lastName: true, phone: true } },
                service: { select: { id: true, name: true, duration: true, price: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(recurring)
    } catch (error) {
        console.error('Error fetching recurring appointments:', error)
        return NextResponse.json({ error: 'Failed to fetch recurring appointments' }, { status: 500 })
    }
}

// POST - Create a recurring appointment pattern
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const locationId = user.locationId
        const franchiseId = user.franchiseId

        if (!locationId) {
            return NextResponse.json({ error: 'No location associated' }, { status: 400 })
        }

        const body = await request.json()
        const {
            clientId,
            serviceId,
            employeeId,
            frequency,
            dayOfWeek,
            dayOfMonth,
            preferredTime,
            startDate,
            endDate,
            maxOccurrences
        } = body

        if (!clientId || !serviceId || !frequency || !preferredTime || !startDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Validate frequency
        if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(frequency)) {
            return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
        }

        // Verify client and service belong to franchise
        const [client, service] = await Promise.all([
            prisma.client.findFirst({ where: { id: clientId, franchiseId } }),
            prisma.service.findFirst({ where: { id: serviceId, franchiseId } })
        ])

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }
        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        const recurring = await prisma.recurringAppointment.create({
            data: {
                locationId,
                clientId,
                serviceId,
                employeeId,
                frequency,
                dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek) : null,
                dayOfMonth: dayOfMonth !== undefined ? parseInt(dayOfMonth) : null,
                preferredTime,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                maxOccurrences: maxOccurrences ? parseInt(maxOccurrences) : null
            },
            include: {
                client: { select: { firstName: true, lastName: true } },
                service: { select: { name: true } }
            }
        })

        return NextResponse.json(recurring, { status: 201 })
    } catch (error) {
        console.error('Error creating recurring appointment:', error)
        return NextResponse.json({ error: 'Failed to create recurring appointment' }, { status: 500 })
    }
}

// PUT - Update a recurring appointment
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const locationId = user.locationId

        const body = await request.json()
        const { id, frequency, dayOfWeek, dayOfMonth, preferredTime, endDate, maxOccurrences, isActive, employeeId } = body

        if (!id) {
            return NextResponse.json({ error: 'Recurring appointment ID required' }, { status: 400 })
        }

        // Verify belongs to location
        const existing = await prisma.recurringAppointment.findFirst({
            where: { id, locationId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 })
        }

        const updated = await prisma.recurringAppointment.update({
            where: { id },
            data: {
                ...(frequency && { frequency }),
                ...(dayOfWeek !== undefined && { dayOfWeek: parseInt(dayOfWeek) }),
                ...(dayOfMonth !== undefined && { dayOfMonth: parseInt(dayOfMonth) }),
                ...(preferredTime && { preferredTime }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(maxOccurrences !== undefined && { maxOccurrences: maxOccurrences ? parseInt(maxOccurrences) : null }),
                ...(isActive !== undefined && { isActive }),
                ...(employeeId !== undefined && { employeeId })
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating recurring appointment:', error)
        return NextResponse.json({ error: 'Failed to update recurring appointment' }, { status: 500 })
    }
}

// DELETE - Deactivate recurring appointment
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const locationId = user.locationId
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 })
        }

        // Verify belongs to location
        const existing = await prisma.recurringAppointment.findFirst({
            where: { id, locationId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 })
        }

        // Soft delete
        await prisma.recurringAppointment.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting recurring appointment:', error)
        return NextResponse.json({ error: 'Failed to delete recurring appointment' }, { status: 500 })
    }
}
