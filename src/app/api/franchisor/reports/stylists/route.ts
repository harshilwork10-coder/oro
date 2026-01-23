import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Stylist Performance API
 * Returns stylist utilization and performance metrics
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                franchisorMemberships: {
                    include: { franchisor: true }
                }
            }
        }) as any

        const franchisorId = user?.franchisorMemberships?.[0]?.franchisor?.id
        if (!franchisorId) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Get locations
        const locations = await prisma.location.findMany({
            where: {
                franchisorId,
                ...(locationId ? { id: locationId } : {})
            },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        // Date range - this month
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        // Get employees (stylists) from these locations via franchise
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId },
            include: {
                employees: {
                    where: {
                        role: { in: ['EMPLOYEE', 'MANAGER'] },
                        status: 'ACTIVE'
                    },
                    select: {
                        id: true,
                        name: true,
                        locationId: true,
                    }
                }
            }
        })

        const employees = franchises.flatMap(f => f.employees)
        const employeeIds = employees.map(e => e.id)

        // Get appointments by employee
        const appointments = await prisma.appointment.findMany({
            where: {
                employeeId: { in: employeeIds },
                startTime: { gte: monthStart },
            },
            select: {
                id: true,
                employeeId: true,
                status: true,
                clientId: true,
                duration: true,
            }
        })

        // Get transactions by employee
        const transactions = await prisma.transaction.findMany({
            where: {
                employeeId: { in: employeeIds },
                createdAt: { gte: monthStart },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }
            },
            select: {
                id: true,
                employeeId: true,
                total: true,
                clientId: true,
            }
        })

        // Calculate per-stylist metrics
        const stylistMetrics = employees.map(emp => {
            const empAppointments = appointments.filter(a => a.employeeId === emp.id)
            const empTransactions = transactions.filter(t => t.employeeId === emp.id)

            const completed = empAppointments.filter(a => a.status === 'COMPLETED' || a.status === 'CHECKED_OUT').length
            const noShows = empAppointments.filter(a => a.status === 'NO_SHOW').length
            const totalBooked = empAppointments.length

            // Unique customers
            const customerIds = new Set<string>()
            empAppointments.forEach(a => a.clientId && customerIds.add(a.clientId))
            empTransactions.forEach(t => t.clientId && customerIds.add(t.clientId))

            // Revenue
            const revenue = empTransactions.reduce((sum, t) => sum + Number(t.total || 0), 0)

            // Booked minutes (using duration field or default 60 min)
            const bookedMinutes = empAppointments.reduce((sum, a) => sum + (a.duration || 60), 0)

            // Available minutes (8 hours * working days in month - simplified)
            const workingDays = 22 // Approximate
            const availableMinutes = 8 * 60 * workingDays
            const utilization = Math.round((bookedMinutes / availableMinutes) * 100)

            return {
                id: emp.id,
                name: emp.name || 'Unknown',
                locationId: emp.locationId,
                appointments: totalBooked,
                completed,
                noShows,
                noShowRate: totalBooked > 0 ? Math.round((noShows / totalBooked) * 100) : 0,
                revenue,
                uniqueCustomers: customerIds.size,
                utilization: Math.min(utilization, 100), // Cap at 100%
            }
        })

        // Sort by revenue
        stylistMetrics.sort((a, b) => b.revenue - a.revenue)

        // Brand-wide summary
        const summary = {
            totalStylists: stylistMetrics.length,
            avgUtilization: stylistMetrics.length > 0
                ? Math.round(stylistMetrics.reduce((sum, s) => sum + s.utilization, 0) / stylistMetrics.length)
                : 0,
            totalRevenue: stylistMetrics.reduce((sum, s) => sum + s.revenue, 0),
            totalNoShows: stylistMetrics.reduce((sum, s) => sum + s.noShows, 0),
        }

        return NextResponse.json({
            success: true,
            data: {
                summary,
                stylists: stylistMetrics
            }
        })

    } catch (error) {
        console.error('Stylists API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
