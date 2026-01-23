import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Location 360 API
 * Returns comprehensive detail for a single location
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    const locationId = params.id

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Get location with related data
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: {
                franchise: { select: { id: true, name: true } },
                stations: { select: { id: true, name: true } },
                provisioningTasks: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Date boundaries
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)
        const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)

        // Today's appointments
        const todayAppointments = await prisma.appointment.findMany({
            where: {
                locationId,
                startTime: { gte: todayStart, lte: todayEnd }
            },
            select: {
                id: true,
                status: true,
                clientId: true,
                startTime: true,
            }
        })

        // Today's transactions
        const todayTransactions = await prisma.transaction.findMany({
            where: {
                locationId,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }
            },
            select: {
                id: true,
                total: true,
                clientId: true,
                appointmentId: true,
                createdAt: true,
            }
        })

        // Month transactions for customer analysis
        const monthTransactions = await prisma.transaction.findMany({
            where: {
                locationId,
                createdAt: { gte: monthStart },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] },
                clientId: { not: null }
            },
            select: {
                clientId: true,
                createdAt: true,
            }
        })

        // Today stats
        const todayStats = {
            appointmentsBooked: todayAppointments.length,
            appointmentsCompleted: todayAppointments.filter(a => a.status === 'COMPLETED' || a.status === 'CHECKED_OUT').length,
            appointmentsUpcoming: todayAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
            noShows: todayAppointments.filter(a => a.status === 'NO_SHOW').length,
            walkIns: todayTransactions.filter(t => !t.appointmentId).length,
            revenue: todayTransactions.reduce((sum, t) => sum + Number(t.total || 0), 0),
            lastActivity: todayTransactions.length > 0
                ? todayTransactions[todayTransactions.length - 1].createdAt
                : null,
        }

        // Unique customers today
        const todayCustomerIds = new Set<string>()
        todayAppointments.forEach(a => a.clientId && todayCustomerIds.add(a.clientId))
        todayTransactions.forEach(t => t.clientId && todayCustomerIds.add(t.clientId))
        todayStats.uniqueCustomers = todayCustomerIds.size
        todayStats.totalVisits = todayStats.appointmentsCompleted + todayStats.walkIns

        // Customer analysis (this month)
        const monthCustomerFirstVisit: Record<string, Date> = {}
        monthTransactions.forEach(t => {
            if (t.clientId && !monthCustomerFirstVisit[t.clientId]) {
                monthCustomerFirstVisit[t.clientId] = t.createdAt
            }
        })
        const monthCustomerIds = Object.keys(monthCustomerFirstVisit)
        const newCustomers = monthCustomerIds.filter(id => monthCustomerFirstVisit[id] >= monthStart).length
        const returningCustomers = monthCustomerIds.length - newCustomers

        // Go-Live checklist (if not active)
        let goLiveChecklist = null
        if (location.provisioningStatus !== 'ACTIVE') {
            const task = location.provisioningTasks[0]
            goLiveChecklist = {
                status: location.provisioningStatus,
                taskStatus: task?.status || 'OPEN',
                daysInProgress: task
                    ? Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                    : 0,
                checklist: {
                    stationsCreated: location.stations.length > 0,
                    pairingDone: location.provisioningStatus === 'READY_FOR_INSTALL' || location.provisioningStatus === 'ACTIVE',
                    hoursSet: !!location.hours,
                }
            }
        }

        // Alerts
        const alerts: { type: string; message: string; severity: 'warning' | 'error' }[] = []

        const noShowRate = todayStats.appointmentsBooked > 0
            ? Math.round((todayStats.noShows / todayStats.appointmentsBooked) * 100)
            : 0

        if (noShowRate > 20) {
            alerts.push({ type: 'HIGH_NO_SHOW', message: `High no-show rate today: ${noShowRate}%`, severity: 'warning' })
        }

        if (todayStats.appointmentsBooked === 0 && location.provisioningStatus === 'ACTIVE') {
            alerts.push({ type: 'NO_BOOKINGS', message: 'No appointments booked today', severity: 'warning' })
        }

        return NextResponse.json({
            success: true,
            data: {
                location: {
                    id: location.id,
                    name: location.name,
                    address: location.address,
                    phone: location.phone,
                    status: location.provisioningStatus,
                    franchisee: location.franchise?.name || 'Unknown',
                    stationCount: location.stations.length,
                },
                today: todayStats,
                customers: {
                    thisMonth: monthCustomerIds.length,
                    newCustomers,
                    returningCustomers,
                },
                goLiveChecklist,
                alerts,
            }
        })

    } catch (error) {
        console.error('Location 360 API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
