import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * GET /api/pos/lottery-reconciliation — Lottery reconciliation report
 * POST /api/pos/lottery-reconciliation — Record lottery ticket counts for reconciliation
 *
 * C-store lottery reconciliation: track books activated, tickets sold, prizes paid,
 * and reconcile against state lottery commission reports.
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { date, games, cashierNotes } = body

        // games: [{ gameNumber, gameName, bookNumber, startTicket, endTicket, ticketsSold, prizesPaid, instantPrizes }]
        if (!games?.length) {
            return NextResponse.json({ error: 'games[] required with ticket counts' }, { status: 400 })
        }

        const reconciliationDate = date ? new Date(date) : new Date()

        // Calculate totals
        let totalTicketsSold = 0
        let totalRevenue = 0
        let totalPrizesPaid = 0

        const processedGames = games.map((g: any) => {
            const ticketsSold = g.ticketsSold || (g.endTicket - g.startTicket + 1)
            const ticketPrice = g.ticketPrice || 1
            const revenue = ticketsSold * ticketPrice
            totalTicketsSold += ticketsSold
            totalRevenue += revenue
            totalPrizesPaid += g.prizesPaid || 0

            return {
                gameNumber: g.gameNumber,
                gameName: g.gameName,
                bookNumber: g.bookNumber,
                startTicket: g.startTicket,
                endTicket: g.endTicket,
                ticketPrice,
                ticketsSold,
                revenue,
                prizesPaid: g.prizesPaid || 0,
                instantPrizes: g.instantPrizes || 0,
                netRevenue: revenue - (g.prizesPaid || 0)
            }
        })

        // Store as an audit log entry with full details (no separate model needed)
        const entry = await prisma.auditLog.create({
            data: {
                userId: user.id,
                userEmail: user.email || '',
                userRole: user.role,
                action: 'LOTTERY_RECONCILIATION',
                entityType: 'LotteryReconciliation',
                entityId: reconciliationDate.toISOString().split('T')[0],
                franchiseId: user.franchiseId,
                changes: JSON.stringify({
                    date: reconciliationDate,
                    games: processedGames,
                    totals: { totalTicketsSold, totalRevenue, totalPrizesPaid, netRevenue: totalRevenue - totalPrizesPaid },
                    cashierNotes
                })
            }
        })

        return NextResponse.json({
            success: true,
            reconciliation: {
                id: entry.id,
                date: reconciliationDate,
                totals: { totalTicketsSold, totalRevenue, totalPrizesPaid, netRevenue: totalRevenue - totalPrizesPaid },
                games: processedGames
            }
        }, { status: 201 })
    } catch (error: any) {
        console.error('[LOTTERY_RECON_POST]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    try {
        const where: any = {
            franchiseId: user.franchiseId,
            action: 'LOTTERY_RECONCILIATION'
        }
        if (from || to) {
            where.createdAt = {}
            if (from) where.createdAt.gte = new Date(from)
            if (to) where.createdAt.lte = new Date(to)
        }

        const entries = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 30
        })

        const reconciliations = entries.map(e => {
            const data = e.changes ? JSON.parse(e.changes) : {}
            return {
                id: e.id,
                date: data.date,
                totals: data.totals,
                gamesCount: data.games?.length || 0,
                createdAt: e.createdAt,
                createdBy: e.userEmail
            }
        })

        return NextResponse.json({ reconciliations })
    } catch (error: any) {
        console.error('[LOTTERY_RECON_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// S8-03: Manager review/approve reconciliation
export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { reconciliationId, action, notes } = body

        if (!reconciliationId || !action) {
            return NextResponse.json({ error: 'reconciliationId and action (APPROVE/FLAG) required' }, { status: 400 })
        }

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: action === 'APPROVE' ? 'LOTTERY_RECON_APPROVED' : 'LOTTERY_RECON_FLAGGED',
            entityType: 'LotteryReconciliation', entityId: reconciliationId,
            details: { decision: action, notes, reviewedAt: new Date().toISOString() }
        })

        return NextResponse.json({ success: true, reconciliationId, status: action })
    } catch (error: any) {
        console.error('[LOTTERY_RECON_PUT]', error)
        return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
    }
}
