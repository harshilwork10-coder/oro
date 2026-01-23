import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Brand Command Center API
 * Returns daily health metrics for franchisor dashboards
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Get franchisor owned by this user (matching auth.ts pattern)
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Date boundaries for "today"
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        // Get all franchises under this franchisor
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId: franchisor.id },
            select: { id: true }
        })
        const franchiseIds = franchises.map(f => f.id)

        // 1) Location counts - get locations via franchise relationship
        const locations = await prisma.location.findMany({
            where: { franchiseId: { in: franchiseIds } },
            select: {
                id: true,
                name: true,
                provisioningStatus: true,
            }
        })

        const locationCounts = {
            total: locations.length,
            active: locations.filter(l => l.provisioningStatus === 'ACTIVE').length,
            pending: locations.filter(l => l.provisioningStatus === 'PROVISIONING_PENDING').length,
            suspended: locations.filter(l => l.provisioningStatus === 'SUSPENDED').length,
        }

        const locationIds = locations.map(l => l.id)

        // 2) Appointments today
        const appointments = await prisma.appointment.findMany({
            where: {
                locationId: { in: locationIds },
                startTime: { gte: todayStart, lte: todayEnd }
            },
            select: {
                id: true,
                status: true,
                clientId: true,
            }
        })

        const appointmentStats = {
            booked: appointments.length,
            completed: appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CHECKED_OUT').length,
            upcoming: appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
            noShows: appointments.filter(a => a.status === 'NO_SHOW').length,
        }

        // 3) Transactions today - via franchise relationship
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: { in: franchiseIds },
                createdAt: { gte: todayStart, lte: todayEnd },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }
            },
            select: {
                id: true,
                total: true,
                clientId: true,
            }
        })

        const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
        const walkIns = transactions.length // Simplified - would need appointmentId

        // Unique customers
        const customerIds = new Set<string>()
        appointments.forEach(a => a.clientId && customerIds.add(a.clientId))
        transactions.forEach(t => t.clientId && customerIds.add(t.clientId))
        const uniqueCustomers = customerIds.size

        // Total visits = completed appointments + walk-ins
        const totalVisits = appointmentStats.completed + walkIns

        // No-show rate
        const noShowRate = appointmentStats.booked > 0
            ? Math.round((appointmentStats.noShows / appointmentStats.booked) * 100)
            : 0

        // 4) Alerts (problems to address)
        const alerts: { type: string; message: string }[] = []

        if (noShowRate > 20) {
            alerts.push({
                type: 'HIGH_NO_SHOW',
                message: `High no-show rate today: ${noShowRate}%`
            })
        }

        if (locationCounts.suspended > 0) {
            alerts.push({
                type: 'SUSPENDED_LOCATIONS',
                message: `${locationCounts.suspended} location(s) inactive`
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                franchisees: franchises.length,
                locations: locationCounts,
                appointments: appointmentStats,
                walkIns,
                totalVisits,
                uniqueCustomers,
                revenue: totalRevenue,
                noShowRate,
                alerts,
                asOf: new Date().toISOString()
            }
        })

    } catch (error) {
        console.error('Command Center API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
