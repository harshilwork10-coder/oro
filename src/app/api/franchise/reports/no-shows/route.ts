import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET: No-Show & Cancellation Report
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

        // Default to last 30 days
        const now = new Date()
        const defaultStart = new Date(now)
        defaultStart.setDate(now.getDate() - 30)

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

        // Get location IDs for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        if (locationIds.length === 0) {
            return ApiResponse.success({
                summary: { totalAppointments: 0, totalNoShows: 0, totalCancellations: 0, noShowRate: 0, cancellationRate: 0, estimatedLostRevenue: 0 },
                byBarber: [],
                byDayOfWeek: [],
                repeatOffenders: [],
                recentAppointments: [],
                dateRange: { start: dateStart.toISOString(), end: dateEnd.toISOString() },
                generatedAt: new Date().toISOString()
            })
        }

        // Get all cancelled/no-show appointments
        const appointments = await prisma.appointment.findMany({
            where: {
                locationId: { in: locationIds },
                status: { in: ['CANCELLED', 'NO_SHOW'] },
                startTime: {
                    gte: dateStart,
                    lte: dateEnd
                }
            },
            orderBy: { startTime: 'desc' }
        })

        // Fetch related data separately
        const clientIds = [...new Set(appointments.map(a => a.clientId).filter(Boolean))] as string[]
        const employeeIds = [...new Set(appointments.map(a => a.employeeId).filter(Boolean))] as string[]
        const serviceIds = [...new Set(appointments.map(a => a.serviceId).filter(Boolean))] as string[]

        const [clients, employees, services] = await Promise.all([
            prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, firstName: true, lastName: true, email: true, phone: true } }),
            prisma.user.findMany({ where: { id: { in: employeeIds } }, select: { id: true, name: true } }),
            prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true, price: true } })
        ])

        const clientMap = new Map(clients.map(c => [c.id, c]))
        const employeeMap = new Map(employees.map(e => [e.id, e]))
        const serviceMap = new Map(services.map(s => [s.id, s]))

        // Calculate statistics
        let totalNoShows = 0
        let totalCancellations = 0
        let estimatedLostRevenue = 0

        // By barber breakdown
        const byBarber: Record<string, {
            id: string
            name: string
            noShows: number
            cancellations: number
            lostRevenue: number
        }> = {}

        // By client breakdown (repeat offenders)
        const byClient: Record<string, {
            id: string
            name: string
            email: string
            phone: string
            noShows: number
            cancellations: number
            total: number
        }> = {}

        // By day of week
        const byDayOfWeek: Record<number, { day: string; count: number }> = {
            0: { day: 'Sunday', count: 0 },
            1: { day: 'Monday', count: 0 },
            2: { day: 'Tuesday', count: 0 },
            3: { day: 'Wednesday', count: 0 },
            4: { day: 'Thursday', count: 0 },
            5: { day: 'Friday', count: 0 },
            6: { day: 'Saturday', count: 0 }
        }

        appointments.forEach(apt => {
            const isNoShow = apt.status === 'NO_SHOW'
            const service = apt.serviceId ? serviceMap.get(apt.serviceId) : null
            const employee = apt.employeeId ? employeeMap.get(apt.employeeId) : null
            const client = apt.clientId ? clientMap.get(apt.clientId) : null
            const servicePrice = Number(service?.price || 0)
            const dayOfWeek = new Date(apt.startTime).getDay()

            if (isNoShow) {
                totalNoShows++
            } else {
                totalCancellations++
            }

            estimatedLostRevenue += servicePrice
            byDayOfWeek[dayOfWeek].count++

            // By barber
            if (employee) {
                if (!byBarber[employee.id]) {
                    byBarber[employee.id] = {
                        id: employee.id,
                        name: employee.name || 'Unknown',
                        noShows: 0,
                        cancellations: 0,
                        lostRevenue: 0
                    }
                }
                if (isNoShow) {
                    byBarber[employee.id].noShows++
                } else {
                    byBarber[employee.id].cancellations++
                }
                byBarber[employee.id].lostRevenue += servicePrice
            }

            // By client
            if (client) {
                const clientId = client.id
                if (!byClient[clientId]) {
                    byClient[clientId] = {
                        id: clientId,
                        name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
                        email: client.email || '',
                        phone: client.phone || '',
                        noShows: 0,
                        cancellations: 0,
                        total: 0
                    }
                }
                if (isNoShow) {
                    byClient[clientId].noShows++
                } else {
                    byClient[clientId].cancellations++
                }
                byClient[clientId].total++
            }
        })

        // Get total appointments for percentage calculation
        const totalAppointments = await prisma.appointment.count({
            where: {
                locationId: { in: locationIds },
                startTime: {
                    gte: dateStart,
                    lte: dateEnd
                }
            }
        })

        const noShowRate = totalAppointments > 0 ? (totalNoShows / totalAppointments) * 100 : 0
        const cancellationRate = totalAppointments > 0 ? (totalCancellations / totalAppointments) * 100 : 0

        // Filter repeat offenders (more than 1 no-show/cancellation)
        const repeatOffenders = Object.values(byClient)
            .filter(c => c.total > 1)
            .sort((a, b) => b.total - a.total)

        return ApiResponse.success({
            summary: {
                totalAppointments,
                totalNoShows,
                totalCancellations,
                noShowRate,
                cancellationRate,
                estimatedLostRevenue
            },
            byBarber: Object.values(byBarber).sort((a, b) =>
                (b.noShows + b.cancellations) - (a.noShows + a.cancellations)
            ),
            byDayOfWeek: Object.values(byDayOfWeek),
            repeatOffenders,
            recentAppointments: appointments.slice(0, 20).map(apt => {
                const client = apt.clientId ? clientMap.get(apt.clientId) : null
                const employee = apt.employeeId ? employeeMap.get(apt.employeeId) : null
                const service = apt.serviceId ? serviceMap.get(apt.serviceId) : null
                return {
                    id: apt.id,
                    date: apt.startTime,
                    status: apt.status,
                    client: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
                    barber: employee?.name || 'Unassigned',
                    service: service?.name || 'Unknown',
                    lostRevenue: Number(service?.price || 0)
                }
            }),
            dateRange: {
                start: dateStart.toISOString(),
                end: dateEnd.toISOString()
            },
            generatedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error generating no-show report:', error)
        return ApiResponse.serverError('Failed to generate no-show report')
    }
}
