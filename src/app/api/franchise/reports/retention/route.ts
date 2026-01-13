import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET: Client Retention Report
// Tracks returning clients and rebooking rates
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

        // Get all transactions in period
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
                client: { select: { id: true, firstName: true, lastName: true, createdAt: true } },
                lineItems: {
                    where: { type: 'SERVICE' },
                    include: {
                        staff: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        // Get historical transactions to determine first-timers
        const historicalTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { lt: dateStart }
            },
            select: { clientId: true }
        })

        const previousClients = new Set(
            historicalTransactions.map(t => t.clientId).filter(Boolean)
        )

        // Track client visits
        const clientVisits: Record<string, {
            id: string
            name: string
            visitCount: number
            firstVisit: Date
            lastVisit: Date
            totalSpent: number
            preferredBarber: string
            isNew: boolean
        }> = {}

        // Track barber retention
        const barberStats: Record<string, {
            id: string
            name: string
            totalClients: number
            newClients: number
            returningClients: number
            revenue: number
        }> = {}

        let newClients = 0
        let returningClients = 0

        transactions.forEach(tx => {
            if (!tx.clientId) return

            const isNew = !previousClients.has(tx.clientId) && !clientVisits[tx.clientId]

            if (isNew) {
                newClients++
            } else if (!clientVisits[tx.clientId]) {
                returningClients++
            }

            if (!clientVisits[tx.clientId]) {
                clientVisits[tx.clientId] = {
                    id: tx.clientId,
                    name: tx.client ? `${tx.client.firstName || ''} ${tx.client.lastName || ''}`.trim() : 'Unknown',
                    visitCount: 0,
                    firstVisit: tx.createdAt,
                    lastVisit: tx.createdAt,
                    totalSpent: 0,
                    preferredBarber: '',
                    isNew
                }
            }

            clientVisits[tx.clientId].visitCount++
            clientVisits[tx.clientId].lastVisit = tx.createdAt
            clientVisits[tx.clientId].totalSpent += Number(tx.total || 0)

            // Track barber stats
            tx.lineItems.forEach(item => {
                if (!item.staff) return

                if (!barberStats[item.staff.id]) {
                    barberStats[item.staff.id] = {
                        id: item.staff.id,
                        name: item.staff.name || 'Unknown',
                        totalClients: 0,
                        newClients: 0,
                        returningClients: 0,
                        revenue: 0
                    }
                }

                barberStats[item.staff.id].revenue += Number(item.total || 0)

                // Check if this is first service with this barber in period
                const clientId = tx.clientId
                if (clientId && clientVisits[clientId] && !clientVisits[clientId].preferredBarber) {
                    clientVisits[clientId].preferredBarber = item.staff.name || 'Unknown'
                    barberStats[item.staff.id].totalClients++
                    if (isNew) {
                        barberStats[item.staff.id].newClients++
                    } else {
                        barberStats[item.staff.id].returningClients++
                    }
                }
            })
        })

        // Calculate retention metrics
        const totalClients = Object.keys(clientVisits).length
        const repeatVisitors = Object.values(clientVisits).filter(c => c.visitCount > 1).length
        const retentionRate = totalClients > 0 ? (repeatVisitors / totalClients) * 100 : 0

        // Calculate avg days between visits for repeat clients
        let totalDaysBetween = 0
        let repeatCount = 0
        Object.values(clientVisits).forEach(client => {
            if (client.visitCount > 1) {
                const days = (client.lastVisit.getTime() - client.firstVisit.getTime()) / (1000 * 60 * 60 * 24)
                const avgDays = days / (client.visitCount - 1)
                totalDaysBetween += avgDays
                repeatCount++
            }
        })
        const avgDaysBetweenVisits = repeatCount > 0 ? totalDaysBetween / repeatCount : 0

        // Top returning clients
        const topClients = Object.values(clientVisits)
            .filter(c => c.visitCount > 1)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10)

        // Barber retention rates
        const barbers = Object.values(barberStats)
            .map(b => ({
                ...b,
                retentionRate: b.totalClients > 0 ? (b.returningClients / b.totalClients) * 100 : 0
            }))
            .sort((a, b) => b.retentionRate - a.retentionRate)

        return ApiResponse.success({
            summary: {
                totalClients,
                newClients,
                returningClients,
                repeatVisitors,
                retentionRate,
                avgDaysBetweenVisits
            },
            topClients,
            barbers,
            dateRange: {
                start: dateStart.toISOString(),
                end: dateEnd.toISOString()
            },
            generatedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error generating retention report:', error)
        return ApiResponse.serverError('Failed to generate retention report')
    }
}
