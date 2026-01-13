import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/owner/today-stats - Get today's revenue, clients, tips for salon owner
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const franchiseId = session.user.franchiseId

        // Get today's date range
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        // Get yesterday's date range for comparison
        const startOfYesterday = new Date(startOfDay)
        startOfYesterday.setDate(startOfYesterday.getDate() - 1)

        const endOfYesterday = new Date(endOfDay)
        endOfYesterday.setDate(endOfYesterday.getDate() - 1)

        // Get today's completed transactions
        const todayTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            select: {
                total: true,
                tip: true,
                clientId: true,
                paymentMethod: true
            }
        })

        // Get yesterday's transactions for comparison
        const yesterdayTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfYesterday,
                    lte: endOfYesterday
                }
            },
            select: {
                total: true
            }
        })

        // Calculate today's stats
        const totalRevenueToday = todayTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0)
        const totalTipsToday = todayTransactions.reduce((sum, tx) => sum + Number(tx.tip || 0), 0)
        const totalClients = new Set(todayTransactions.filter(tx => tx.clientId).map(tx => tx.clientId)).size
        const totalTransactions = todayTransactions.length

        // Walk-ins = transactions without clientId
        const walkIns = todayTransactions.filter(tx => !tx.clientId).length

        // Yesterday's revenue for comparison
        const yesterdayRevenue = yesterdayTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0)

        // Calculate change percentage
        const changePercent = yesterdayRevenue > 0
            ? ((totalRevenueToday - yesterdayRevenue) / yesterdayRevenue) * 100
            : 0

        // Get franchise/shop name
        const franchise = await prisma.franchise.findUnique({
            where: { id: franchiseId },
            select: { name: true }
        })

        return NextResponse.json({
            shopName: franchise?.name || 'My Salon',
            totalRevenueToday,
            totalTipsToday,
            totalServiceRevenue: totalRevenueToday - totalTipsToday,
            totalClients,
            totalTransactions,
            walkIns,
            yesterdayRevenue,
            changePercent
        })

    } catch (error) {
        console.error('[OWNER_TODAY_STATS] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
