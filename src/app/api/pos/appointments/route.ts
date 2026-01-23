import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

// GET /api/pos/appointments - Fetch today's appointments (mobile-ready)
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const today = new Date()
        const dayStart = startOfDay(today)
        const dayEnd = endOfDay(today)

        // Get location IDs for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        // Get appointments for today at any location in this franchise
        const appointments = await prisma.appointment.findMany({
            where: {
                locationId: { in: locationIds },
                startTime: {
                    gte: dayStart,
                    lte: dayEnd
                }
            },
            select: {
                id: true,
                clientId: true,
                employeeId: true,
                serviceId: true,
                startTime: true,
                endTime: true,
                status: true,
                notes: true
            },
            orderBy: {
                startTime: 'asc'
            }
        })

        // Fetch related data separately for compatibility
        const clientIds = appointments.map(a => a.clientId).filter(Boolean) as string[]
        const employeeIds = appointments.map(a => a.employeeId).filter(Boolean) as string[]
        const serviceIds = appointments.map(a => a.serviceId).filter(Boolean) as string[]

        const [clients, employees, services] = await Promise.all([
            prisma.client.findMany({
                where: { id: { in: clientIds } },
                select: { id: true, firstName: true, lastName: true, phone: true }
            }),
            prisma.user.findMany({
                where: { id: { in: employeeIds } },
                select: { id: true, name: true }
            }),
            prisma.service.findMany({
                where: { id: { in: serviceIds } },
                select: { id: true, name: true }
            })
        ])

        const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
        const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]))
        const serviceMap = Object.fromEntries(services.map(s => [s.id, s]))

        const appointmentsFormatted = appointments.map(apt => {
            const client = apt.clientId ? clientMap[apt.clientId] : null
            const employee = apt.employeeId ? employeeMap[apt.employeeId] : null
            const service = apt.serviceId ? serviceMap[apt.serviceId] : null

            return {
                id: apt.id,
                customerName: client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'Walk-in',
                customerPhone: client?.phone || null,
                stylistName: employee?.name || null,
                startTime: apt.startTime.getTime(),
                endTime: apt.endTime?.getTime() || null,
                services: service ? [service.name] : [],
                status: apt.status,
                notes: apt.notes
            }
        })

        return NextResponse.json({
            success: true,
            data: appointmentsFormatted
        })
    } catch (error) {
        console.error('[API_APPOINTMENTS_ERROR]', error)
        return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 })
    }
}

// POST /api/pos/appointments - Create new appointment (for phone bookings)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        console.log('[CREATE_APPOINTMENT] Request body:', body)
        const { customerName, customerPhone, serviceId, startTime, notes } = body

        if (!customerName || !customerPhone || !serviceId || !startTime) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields'
            }, { status: 400 })
        }

        // Get the service first - this tells us the franchise
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            select: { id: true, name: true, duration: true, franchiseId: true }
        })

        if (!service) {
            console.error('[CREATE_APPOINTMENT] Service not found:', serviceId)
            return NextResponse.json({
                success: false,
                error: 'Service not found'
            }, { status: 400 })
        }

        // Try to get auth user (may be null for walk-in bookings)
        const user = await getAuthUser(req)
        console.log('[CREATE_APPOINTMENT] Auth user:', user?.id || 'No auth')

        // Use service's franchiseId as primary (guaranteed to exist)
        const franchiseId = service.franchiseId
        if (!franchiseId) {
            return NextResponse.json({
                success: false,
                error: 'Service has no franchise'
            }, { status: 400 })
        }

        // Get location
        const location = await prisma.location.findFirst({
            where: { franchiseId: franchiseId },
            select: { id: true }
        })

        if (!location) {
            return NextResponse.json({
                success: false,
                error: 'No location found'
            }, { status: 400 })
        }

        // Find or create client by phone
        const nameParts = customerName.trim().split(' ')
        const firstName = nameParts[0] || customerName
        const lastName = nameParts.slice(1).join(' ') || ''

        let client = await prisma.client.findFirst({
            where: {
                franchiseId: franchiseId,
                phone: customerPhone
            }
        })

        if (!client) {
            client = await prisma.client.create({
                data: {
                    firstName,
                    lastName,
                    phone: customerPhone,
                    franchiseId: franchiseId
                }
            })
            console.log('[CREATE_APPOINTMENT] Created new client:', client.id)
        }

        // Get an employee ID - use auth user or find one from the franchise
        let employeeId = user?.id
        if (!employeeId) {
            const employee = await prisma.user.findFirst({
                where: { franchiseId: franchiseId, role: 'EMPLOYEE' },
                select: { id: true }
            })
            employeeId = employee?.id
        }

        if (!employeeId) {
            return NextResponse.json({
                success: false,
                error: 'No employee found'
            }, { status: 400 })
        }

        const durationMs = (service.duration || 30) * 60 * 1000
        const startDate = new Date(startTime)
        const endDate = new Date(startTime + durationMs)

        // Create the appointment
        const appointment = await prisma.appointment.create({
            data: {
                clientId: client.id,
                serviceId: serviceId,
                locationId: location.id,
                startTime: startDate,
                endTime: endDate,
                status: 'CONFIRMED',
                notes: notes || null,
                employeeId: employeeId
            }
        })

        console.log('[CREATE_APPOINTMENT] Created appointment:', appointment.id)

        return NextResponse.json({
            success: true,
            data: {
                id: appointment.id,
                customerName: `${firstName} ${lastName || ''}`.trim(),
                customerPhone: customerPhone,
                stylistName: user?.name || null,
                startTime: appointment.startTime.getTime(),
                endTime: appointment.endTime?.getTime() || null,
                services: [service.name],
                status: appointment.status,
                notes: appointment.notes
            }
        })
    } catch (error) {
        console.error('[API_CREATE_APPOINTMENT_ERROR]', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to create appointment'
        }, { status: 500 })
    }
}
