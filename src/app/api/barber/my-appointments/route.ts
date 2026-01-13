import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/barber/my-appointments - Get today's appointments for the logged-in barber
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const userId = session.user.id

        // Get today's date range
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        // Fetch today's appointments for this barber
        const appointments = await prisma.appointment.findMany({
            where: {
                employeeId: userId,
                startTime: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true
                    }
                },
                service: {
                    select: {
                        name: true,
                        duration: true,
                        price: true
                    }
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        })

        // Transform the data for the dashboard
        const formattedAppointments = appointments.map(apt => ({
            id: apt.id,
            clientName: `${apt.client?.firstName || ''} ${apt.client?.lastName || ''}`.trim() || 'Walk-in',
            clientPhone: apt.client?.phone,
            serviceName: apt.service?.name || 'Service',
            serviceDuration: apt.service?.duration || 30,
            servicePrice: Number(apt.service?.price || 0),
            startTime: apt.startTime,
            endTime: apt.endTime,
            status: apt.status,
            notes: apt.notes
        }))

        // Calculate stats
        const stats = {
            total: appointments.length,
            scheduled: appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
            checkedIn: appointments.filter(a => a.status === 'CHECKED_IN').length,
            inProgress: appointments.filter(a => a.status === 'IN_PROGRESS').length,
            completed: appointments.filter(a => a.status === 'COMPLETED').length,
            noShows: appointments.filter(a => a.status === 'NO_SHOW').length,
            cancelled: appointments.filter(a => a.status === 'CANCELLED').length
        }

        return NextResponse.json({
            appointments: formattedAppointments,
            stats
        })

    } catch (error) {
        console.error('[BARBER_MY_APPOINTMENTS] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }
}
