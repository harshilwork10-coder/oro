import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Lottery report summary
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'today'

        // Calculate date range
        const now = new Date()
        let startDate: Date

        switch (period) {
            case 'week':
                startDate = new Date(now)
                startDate.setDate(now.getDate() - 7)
                break
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            case 'today':
            default:
                startDate = new Date(now)
                startDate.setHours(0, 0, 0, 0)
        }

        // Get sales transactions
        const sales = await prisma.lotteryTransaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                type: 'SALE',
                createdAt: { gte: startDate }
            }
        })

        // Get payout transactions
        const payouts = await prisma.lotteryTransaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                type: 'PAYOUT',
                createdAt: { gte: startDate }
            }
        })

        // Get active packs with remaining tickets
        const activePacks = await prisma.lotteryPack.findMany({
            where: {
                status: 'ACTIVATED',
                game: {
                    franchiseId: user.franchiseId
                }
            },
            include: {
                game: { select: { gameName: true, ticketPrice: true } }
            }
        })

        // Calculate totals
        const totalSales = sales.reduce((sum, t) => sum + Number(t.amount), 0)
        const totalPayouts = payouts.reduce((sum, t) => sum + Number(t.amount), 0)
        const netRevenue = totalSales - totalPayouts

        const remainingInPacks = activePacks.reduce((sum, p) => {
            const remaining = p.ticketCount - p.soldCount
            const price = Number(p.game.ticketPrice)
            return sum + (remaining * price)
        }, 0)

        const totalRemainingTickets = activePacks.reduce((sum, p) => sum + (p.ticketCount - p.soldCount), 0)

        return NextResponse.json({
            period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            summary: {
                totalSales,
                salesCount: sales.length,
                totalPayouts,
                payoutsCount: payouts.length,
                netRevenue,
                remainingTickets: totalRemainingTickets,
                remainingValue: remainingInPacks
            },
            activePacks: activePacks.map(p => ({
                id: p.id,
                packNumber: p.packNumber,
                gameName: p.game.gameName,
                ticketPrice: p.game.ticketPrice,
                ticketCount: p.ticketCount,
                soldCount: p.soldCount,
                remaining: p.ticketCount - p.soldCount
            }))
        })

    } catch (error) {
        console.error('[LOTTERY_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}

