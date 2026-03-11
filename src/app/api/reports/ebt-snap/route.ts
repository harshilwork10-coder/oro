/**
 * EBT/SNAP Sales Report API
 *
 * GET — Track EBT/SNAP transactions and eligible items
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })
        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)

        // EBT transactions
        const ebtTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                status: 'COMPLETED',
                paymentMethod: 'EBT',
                createdAt: { gte: since }
            },
            select: { id: true, total: true, createdAt: true }
        })

        const ebtRevenue = ebtTransactions.reduce((s, t) => s + Number(t.total || 0), 0)

        // All completed transactions for comparison
        const totalRevenue = await prisma.transaction.aggregate({
            where: { franchiseId: user.franchiseId, status: 'COMPLETED', createdAt: { gte: since } },
            _sum: { total: true },
            _count: { id: true }
        })

        // Daily breakdown
        const dailyEbt: Record<string, { count: number; revenue: number }> = {}
        for (const tx of ebtTransactions) {
            const date = new Date(tx.createdAt).toISOString().split('T')[0]
            if (!dailyEbt[date]) dailyEbt[date] = { count: 0, revenue: 0 }
            dailyEbt[date].count++
            dailyEbt[date].revenue += Number(tx.total || 0)
        }

        // Count EBT-eligible items in catalog (from unified Item model)
        const ebtEligibleCount = await prisma.item.count({
            where: { franchiseId: user.franchiseId, isEbtEligible: true, isActive: true }
        })
        const wicEligibleCount = await prisma.item.count({
            where: { franchiseId: user.franchiseId, isWicEligible: true, isActive: true }
        })

        return ApiResponse.success({
            ebt: {
                transactions: ebtTransactions.length,
                revenue: Math.round(ebtRevenue * 100) / 100,
                pctOfTotal: Number(totalRevenue._sum.total || 0) > 0
                    ? Math.round((ebtRevenue / Number(totalRevenue._sum.total || 1)) * 1000) / 10
                    : 0,
                avgTicket: ebtTransactions.length > 0
                    ? Math.round((ebtRevenue / ebtTransactions.length) * 100) / 100
                    : 0
            },
            catalog: {
                ebtEligibleItems: ebtEligibleCount,
                wicEligibleItems: wicEligibleCount
            },
            dailyBreakdown: Object.entries(dailyEbt).map(([date, data]) => ({
                date,
                ...data,
                revenue: Math.round(data.revenue * 100) / 100
            })),
            periodDays: days
        })
    } catch (error) {
        console.error('[EBT_SNAP_GET]', error)
        return ApiResponse.error('Failed to generate EBT/SNAP report', 500)
    }
}
