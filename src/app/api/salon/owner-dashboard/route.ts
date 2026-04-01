import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

// GET /api/salon/owner-dashboard - Salon owner KPI dashboard (single call)
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const dateParam = searchParams.get('date')
        const targetDate = dateParam ? new Date(dateParam + 'T12:00:00') : new Date()
        const dayStart = startOfDay(targetDate)
        const dayEnd = endOfDay(targetDate)

        // Get locations for franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true, name: true }
        })
        const locationIds = locations.map(l => l.id)

        // Parallel fetch all KPIs
        const [
            appointments,
            transactions,
            noShows,
            pendingApprovals,
            staffOnDuty,
            commissionRules
        ] = await Promise.all([
            // Today's appointments
            prisma.appointment.findMany({
                where: {
                    locationId: { in: locationIds },
                    startTime: { gte: dayStart, lte: dayEnd }
                },
                include: {
                    client: { select: { firstName: true, lastName: true, phone: true } },
                    service: { select: { name: true, price: true, duration: true } },
                    employee: { select: { name: true } }
                },
                orderBy: { startTime: 'asc' }
            }),
            // Today's transactions
            prisma.transaction.findMany({
                where: {
                    franchiseId: user.franchiseId,
                    status: 'COMPLETED',
                    createdAt: { gte: dayStart, lte: dayEnd }
                },
                select: { total: true, tip: true, paymentMethod: true, clientId: true }
            }),
            // No-shows today
            prisma.appointment.count({
                where: {
                    locationId: { in: locationIds },
                    status: 'NO_SHOW',
                    startTime: { gte: dayStart, lte: dayEnd }
                }
            }),
            // Pending approvals
            prisma.appointment.count({
                where: {
                    locationId: { in: locationIds },
                    status: 'PENDING_APPROVAL'
                }
            }),
            // Staff clocked in today
            prisma.timeEntry.findMany({
                where: {
                    locationId: { in: locationIds },
                    clockIn: { gte: dayStart },
                    clockOut: null
                },
                include: {
                    user: { select: { name: true, id: true } }
                }
            }),
            // Commission rules
            prisma.commissionRule.findMany({
                where: { franchiseId: user.franchiseId },
                select: { id: true, name: true, servicePercent: true }
            })
        ])

        // Calculate KPIs
        const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0)
        const totalTips = transactions.reduce((sum, tx) => sum + Number(tx.tip || 0), 0)
        const totalClients = new Set(transactions.filter(tx => tx.clientId).map(tx => tx.clientId)).size
        const avgTicket = transactions.length > 0 ? totalRevenue / transactions.length : 0

        // Appointment stats by status
        const appointmentStats = {
            total: appointments.length,
            scheduled: appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
            completed: appointments.filter(a => a.status === 'COMPLETED').length,
            cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
            noShow: noShows,
            pending: pendingApprovals
        }

        // Source breakdown
        const sourceBreakdown = {
            online: appointments.filter(a => a.source === 'ONLINE').length,
            pos: appointments.filter(a => a.source === 'POS').length,
            phone: appointments.filter(a => a.source === 'PHONE').length,
            walkIn: appointments.filter(a => a.source === 'WALK_IN').length
        }

        // Estimated commissions (simplified: servicePercent * service revenue)
        const defaultCommission = commissionRules.length > 0
            ? Number(commissionRules[0].servicePercent) / 100
            : 0
        const estimatedCommissions = (totalRevenue - totalTips) * defaultCommission

        // Upcoming appointments (next 5 that haven't happened yet)
        const now = new Date()
        const upcoming = appointments
            .filter(a => new Date(a.startTime) > now && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED'))
            .slice(0, 5)
            .map(a => ({
                id: a.id,
                time: a.startTime,
                customer: `${a.client.firstName} ${a.client.lastName}`,
                service: a.service.name,
                staff: a.employee.name,
                price: Number(a.service.price),
                source: a.source,
                status: a.status
            }))

        return NextResponse.json({
            date: targetDate.toISOString().split('T')[0],
            kpis: {
                totalRevenue,
                totalTips,
                serviceRevenue: totalRevenue - totalTips,
                totalClients,
                totalTransactions: transactions.length,
                avgTicket: Math.round(avgTicket * 100) / 100,
                estimatedCommissions: Math.round(estimatedCommissions * 100) / 100
            },
            appointments: appointmentStats,
            sources: sourceBreakdown,
            staffOnDuty: staffOnDuty.map(s => ({ id: s.user.id, name: s.user.name, clockedIn: s.clockIn })),
            upcoming,
            noShowCount: noShows,
            pendingApprovals
        })
    } catch (error) {
        console.error('[SALON_OWNER_DASHBOARD] Error:', error)
        return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
    }
}
