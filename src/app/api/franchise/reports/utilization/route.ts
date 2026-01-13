import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET: Barber Utilization Report
// Measures chair efficiency: services performed, revenue per estimated hour
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return ApiResponse.notFound('User')
        }

        const searchParams = request.nextUrl.searchParams
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        // Default to last 7 days
        const now = new Date()
        const defaultStart = new Date(now)
        defaultStart.setDate(now.getDate() - 7)

        const dateStart = startDate ? new Date(startDate) : defaultStart
        const dateEnd = endDate ? new Date(endDate) : now

        // Get franchise ID
        let franchiseId = user.franchiseId

        if (user.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        if (!franchiseId) {
            return ApiResponse.error('Franchise not found', 404)
        }

        // Get all employees who worked during this period
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: {
                    gte: dateStart,
                    lte: dateEnd
                }
            },
            include: {
                lineItems: {
                    where: { type: 'SERVICE' },
                    include: {
                        staff: { select: { id: true, name: true } },
                        service: { select: { name: true, duration: true, price: true } }
                    }
                }
            }
        })

        // Calculate utilization per barber
        const barberStats: Record<string, {
            id: string
            name: string
            clockedHours: number
            serviceMinutes: number
            serviceCount: number
            revenue: number
            serviceHours: number
            utilizationRate: number
            revenuePerHour: number
            idleHours: number
            workDays: Set<string>
        }> = {}

        // Process transactions to get service time and revenue
        transactions.forEach(tx => {
            const dayKey = tx.createdAt.toISOString().split('T')[0]

            tx.lineItems.forEach(item => {
                if (!item.staff) return

                const barberId = item.staff.id
                if (!barberStats[barberId]) {
                    barberStats[barberId] = {
                        id: barberId,
                        name: item.staff.name || 'Unknown',
                        clockedHours: 0,
                        serviceMinutes: 0,
                        serviceCount: 0,
                        revenue: 0,
                        serviceHours: 0,
                        utilizationRate: 0,
                        revenuePerHour: 0,
                        idleHours: 0,
                        workDays: new Set()
                    }
                }

                const duration = Number(item.service?.duration || 30) // Default 30 min
                barberStats[barberId].serviceMinutes += duration
                barberStats[barberId].serviceCount += Number(item.quantity || 1)
                barberStats[barberId].revenue += Number(item.total || 0)
                barberStats[barberId].workDays.add(dayKey)
            })
        })

        // Calculate utilization metrics (estimate clocked hours from work days)
        const barbers = Object.values(barberStats).map(barber => {
            barber.serviceHours = barber.serviceMinutes / 60

            // Estimate clocked hours: ~8 hours per work day
            const workDayCount = barber.workDays.size
            barber.clockedHours = workDayCount * 8

            if (barber.clockedHours > 0) {
                barber.utilizationRate = Math.min(100, (barber.serviceHours / barber.clockedHours) * 100)
                barber.revenuePerHour = barber.revenue / barber.clockedHours
                barber.idleHours = Math.max(0, barber.clockedHours - barber.serviceHours)
            }

            return {
                id: barber.id,
                name: barber.name,
                clockedHours: barber.clockedHours,
                serviceHours: barber.serviceHours,
                serviceCount: barber.serviceCount,
                revenue: barber.revenue,
                utilizationRate: barber.utilizationRate,
                revenuePerHour: barber.revenuePerHour,
                idleHours: barber.idleHours,
                workDays: workDayCount
            }
        }).sort((a, b) => b.revenue - a.revenue)

        // Calculate summary
        const totalClockedHours = barbers.reduce((sum, b) => sum + b.clockedHours, 0)
        const totalServiceHours = barbers.reduce((sum, b) => sum + b.serviceHours, 0)
        const totalRevenue = barbers.reduce((sum, b) => sum + b.revenue, 0)
        const totalIdleHours = barbers.reduce((sum, b) => sum + b.idleHours, 0)
        const avgUtilization = totalClockedHours > 0 ? (totalServiceHours / totalClockedHours) * 100 : 0
        const avgRevenuePerHour = totalClockedHours > 0 ? totalRevenue / totalClockedHours : 0

        return ApiResponse.success({
            summary: {
                totalClockedHours,
                totalServiceHours,
                totalIdleHours,
                totalRevenue,
                avgUtilization: Math.min(100, avgUtilization),
                avgRevenuePerHour,
                barberCount: barbers.length
            },
            barbers,
            dateRange: {
                start: dateStart.toISOString(),
                end: dateEnd.toISOString()
            },
            generatedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error generating utilization report:', error)
        return ApiResponse.serverError('Failed to generate utilization report')
    }
}
