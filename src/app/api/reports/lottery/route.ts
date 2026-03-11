/**
 * Lottery Report API
 *
 * GET — Lottery sales, payouts, net revenue, and pack tracking
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
        const days = parseInt(searchParams.get('days') || '7')
        const since = new Date(); since.setDate(since.getDate() - days)

        // Lottery transactions
        const lotteryTx = await prisma.lotteryTransaction.findMany({
            where: { franchiseId: user.franchiseId, createdAt: { gte: since } },
            select: { type: true, amount: true, createdAt: true, packId: true, locationId: true }
        })

        const sales = lotteryTx.filter(t => t.type === 'SALE')
        const payouts = lotteryTx.filter(t => t.type === 'PAYOUT')
        const claims = lotteryTx.filter(t => t.type === 'CLAIM')

        const totalSales = sales.reduce((s, t) => s + Number(t.amount || 0), 0)
        const totalPayouts = payouts.reduce((s, t) => s + Number(t.amount || 0), 0)
        const totalClaims = claims.reduce((s, t) => s + Number(t.amount || 0), 0)

        // Active packs
        const activePacks = await prisma.lotteryPack.findMany({
            where: {
                game: { franchiseId: user.franchiseId },
                status: 'ACTIVATED'
            },
            include: {
                game: { select: { gameName: true, gameNumber: true, ticketPrice: true } },
                location: { select: { name: true } }
            }
        })

        const packs = activePacks.map(p => ({
            packNumber: p.packNumber,
            game: p.game.gameName,
            gameNumber: p.game.gameNumber,
            ticketPrice: Number(p.game.ticketPrice),
            location: p.location?.name || 'Unknown',
            totalTickets: p.ticketCount,
            sold: p.soldCount,
            remaining: p.ticketCount - p.soldCount,
            pctSold: p.ticketCount > 0 ? Math.round((p.soldCount / p.ticketCount) * 1000) / 10 : 0,
            activatedAt: p.activatedAt
        }))

        // Daily breakdown
        const dailySales: Record<string, { sales: number; payouts: number }> = {}
        for (const tx of lotteryTx) {
            const date = new Date(tx.createdAt).toISOString().split('T')[0]
            if (!dailySales[date]) dailySales[date] = { sales: 0, payouts: 0 }
            if (tx.type === 'SALE') dailySales[date].sales += Number(tx.amount || 0)
            if (tx.type === 'PAYOUT') dailySales[date].payouts += Number(tx.amount || 0)
        }

        return ApiResponse.success({
            summary: {
                totalSales: Math.round(totalSales * 100) / 100,
                totalPayouts: Math.round(totalPayouts * 100) / 100,
                totalClaims: Math.round(totalClaims * 100) / 100,
                netRevenue: Math.round((totalSales - totalPayouts) * 100) / 100,
                saleCount: sales.length,
                payoutCount: payouts.length
            },
            activePacks: packs,
            dailyBreakdown: Object.entries(dailySales).map(([date, d]) => ({
                date,
                sales: Math.round(d.sales * 100) / 100,
                payouts: Math.round(d.payouts * 100) / 100,
                net: Math.round((d.sales - d.payouts) * 100) / 100
            })).sort((a, b) => a.date.localeCompare(b.date)),
            periodDays: days
        })
    } catch (error) {
        console.error('[LOTTERY_GET]', error)
        return ApiResponse.error('Failed to generate lottery report', 500)
    }
}
