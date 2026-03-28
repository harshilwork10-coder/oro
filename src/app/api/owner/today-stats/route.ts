import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/owner/today-stats - Get today's revenue, clients, tips for owner dashboard
// Supports: ?locationId=xxx to scope by location, ?period=today|week|month
export async function GET(req: Request) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')
        const period = searchParams.get('period') || 'today'

        // Resolve franchiseId scope: if locationId provided, use that location's franchiseId
        let franchiseId = user.franchiseId
        if (locationId) {
            const location = await prisma.location.findFirst({
                where: { id: locationId },
                select: { franchiseId: true }
            })
            if (location?.franchiseId) {
                franchiseId = location.franchiseId
            }
        }

        // Calculate date ranges based on period
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)

        let rangeStart: Date
        let comparisonStart: Date
        let comparisonEnd: Date

        if (period === 'week') {
            rangeStart = new Date(startOfDay)
            rangeStart.setDate(rangeStart.getDate() - 6) // Last 7 days
            comparisonStart = new Date(rangeStart)
            comparisonStart.setDate(comparisonStart.getDate() - 7)
            comparisonEnd = new Date(rangeStart)
            comparisonEnd.setMilliseconds(-1)
        } else if (period === 'month') {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), 1) // First of current month
            comparisonStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            comparisonEnd = new Date(rangeStart)
            comparisonEnd.setMilliseconds(-1)
        } else {
            // today (default)
            rangeStart = startOfDay
            comparisonStart = new Date(startOfDay)
            comparisonStart.setDate(comparisonStart.getDate() - 1)
            comparisonEnd = new Date(endOfDay)
            comparisonEnd.setDate(comparisonEnd.getDate() - 1)
        }

        // Get current period transactions
        const currentTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: rangeStart, lte: endOfDay }
            },
            select: {
                total: true,
                tip: true,
                clientId: true,
                paymentMethod: true
            }
        })

        // Get comparison period transactions
        const comparisonTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: comparisonStart, lte: comparisonEnd }
            },
            select: { total: true }
        })

        // Calculate stats
        const totalRevenueToday = currentTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0)
        const totalTipsToday = currentTransactions.reduce((sum, tx) => sum + Number(tx.tip || 0), 0)
        const totalClients = new Set(currentTransactions.filter(tx => tx.clientId).map(tx => tx.clientId)).size
        const totalTransactions = currentTransactions.length
        const walkIns = currentTransactions.filter(tx => !tx.clientId).length

        // Comparison revenue
        const comparisonRevenue = comparisonTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0)
        const changePercent = comparisonRevenue > 0
            ? ((totalRevenueToday - comparisonRevenue) / comparisonRevenue) * 100
            : 0

        const comparisonLabel = period === 'week' ? 'vs prev week'
            : period === 'month' ? 'vs prev month'
            : 'vs yesterday'

        return NextResponse.json({
            totalRevenueToday,
            totalTipsToday,
            totalServiceRevenue: totalRevenueToday - totalTipsToday,
            totalClients,
            totalTransactions,
            walkIns,
            yesterdayRevenue: comparisonRevenue,
            changePercent,
            comparisonLabel,
            period
        })

    } catch (error) {
        console.error('[OWNER_TODAY_STATS] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
