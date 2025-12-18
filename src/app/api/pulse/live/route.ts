import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pulse/live
 * Live dashboard data for Pulse app
 * Returns industry-appropriate data:
 * - RETAIL: products, inventory, low stock
 * - SERVICE/SALON: appointments, services, upcoming bookings
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId') // 'all' or specific location ID

        // Get industry type from session
        const industryType = (session.user as any)?.industryType || 'SERVICE'

        // Get user with their franchisor info (owner gets access to all locations)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                role: true,
                franchiseId: true,
                franchise: {
                    select: {
                        id: true,
                        franchisorId: true,
                        locations: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        })

        if (!user?.franchise) {
            return NextResponse.json({
                industryType,
                locations: [],
                stats: { todaySales: 0, yesterdaySales: 0, weekSales: 0, transactionCount: 0, averageTicket: 0, lastHourSales: 0 },
                storeBreakdown: [],
                topSellers: [],
                // Industry-specific empty arrays
                lowStockItems: [],
                upcomingAppointments: [],
                employeesOnClock: []
            })
        }

        const locations = user.franchise.locations || []
        const franchiseId = user.franchise.id

        // Build location filter
        const locationFilter = locationId && locationId !== 'all'
            ? { locationId }
            : { franchiseId }

        const now = new Date()
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)

        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const weekStart = new Date(today)
        weekStart.setDate(weekStart.getDate() - 7)

        // Use any casting to bypass stale Prisma types
        const prismaAny = prisma as any

        // Get today's transactions (all locations or specific)
        const todayTransactions = await prismaAny.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: today },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            include: {
                location: { select: { id: true, name: true } },
                lineItems: { include: { product: { select: { name: true } }, service: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        }) as any[]

        // Yesterday's transactions
        const yesterdayTransactions = await prismaAny.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: yesterday, lt: today },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            select: { total: true }
        }) as any[]

        // Week transactions
        const weekTransactions = await prismaAny.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: weekStart },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            select: { total: true }
        }) as any[]

        // Calculate totals
        const todaySales = todayTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0)
        const yesterdaySales = yesterdayTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0)
        const weekSales = weekTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0)
        const transactionCount = todayTransactions.length
        const averageTicket = transactionCount > 0 ? todaySales / transactionCount : 0

        // Per-store breakdown (only if showing all stores)
        const storeBreakdown = locationId === 'all' || !locationId
            ? locations.map((loc: any) => {
                const locSales = todayTransactions
                    .filter((t: any) => t.location?.id === loc.id)
                    .reduce((sum: number, t: any) => sum + Number(t.total), 0)
                const locCount = todayTransactions.filter((t: any) => t.location?.id === loc.id).length
                return {
                    id: loc.id,
                    name: loc.name,
                    todaySales: locSales,
                    transactionCount: locCount
                }
            })
            : []

        // Top sellers - include both products AND services
        const itemSales: Record<string, { name: string, type: string, quantity: number, revenue: number }> = {}
        todayTransactions.forEach((tx: any) => {
            tx.lineItems?.forEach((item: any) => {
                const name = item.product?.name || item.service?.name || item.name || 'Unknown'
                const type = item.product ? 'product' : item.service ? 'service' : 'other'
                if (!itemSales[name]) {
                    itemSales[name] = { name, type, quantity: 0, revenue: 0 }
                }
                itemSales[name].quantity += item.quantity || 1
                itemSales[name].revenue += Number(item.total) || 0
            })
        })
        const topSellers = Object.values(itemSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)

        // Industry-specific data
        let lowStockItems: any[] = []
        let upcomingAppointments: any[] = []

        if (industryType === 'RETAIL') {
            // RETAIL: Get low stock items
            lowStockItems = await prismaAny.product.findMany({
                where: {
                    franchiseId,
                    stock: { lte: 5 },
                    status: 'ACTIVE'
                },
                select: {
                    id: true,
                    name: true,
                    stock: true,
                    location: { select: { name: true } }
                },
                take: 10
            }).then((items: any[]) => items.map((p: any) => ({
                id: p.id,
                name: p.name,
                stock: p.stock || 0,
                location: p.location?.name || 'Main'
            }))).catch(() => [])
        } else {
            // SERVICE/SALON: Get upcoming appointments today
            upcomingAppointments = await prismaAny.appointment.findMany({
                where: {
                    franchiseId,
                    startTime: { gte: now },
                    status: { in: ['SCHEDULED', 'CONFIRMED'] }
                },
                select: {
                    id: true,
                    startTime: true,
                    client: { select: { firstName: true, lastName: true } },
                    service: { select: { name: true } },
                    employee: { select: { name: true } }
                },
                orderBy: { startTime: 'asc' },
                take: 10
            }).then((appts: any[]) => appts.map((a: any) => ({
                id: a.id,
                time: new Date(a.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                client: `${a.client?.firstName || ''} ${a.client?.lastName || ''}`.trim() || 'Walk-in',
                service: a.service?.name || 'Service',
                employee: a.employee?.name || 'Any'
            }))).catch(() => [])
        }

        // Employees on clock
        let employeesOnClock: any[] = []
        try {
            const activeShifts = await prismaAny.shift.findMany({
                where: {
                    clockOut: null
                },
                include: {
                    employee: { select: { name: true } },
                    location: { select: { name: true } }
                }
            }) as any[]
            employeesOnClock = activeShifts.map((shift: any) => ({
                name: shift.employee?.name || 'Unknown',
                location: shift.location?.name || 'Unknown',
                since: shift.clockIn?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || ''
            }))
        } catch (e) {
            // Shift model may not exist, that's ok
        }

        return NextResponse.json({
            industryType,
            locations,
            stats: {
                todaySales,
                yesterdaySales,
                weekSales,
                transactionCount,
                averageTicket,
                lastHourSales: 0 // Can calculate if needed
            },
            storeBreakdown,
            topSellers,
            // Industry-specific data
            lowStockItems,          // RETAIL only
            upcomingAppointments,   // SERVICE only
            employeesOnClock
        })

    } catch (error) {
        console.error('Pulse live error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
