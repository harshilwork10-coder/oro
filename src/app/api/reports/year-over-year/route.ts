/**
 * Year-over-Year Comparison Report API
 *
 * GET — Compare current period vs same period last year
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
        const period = searchParams.get('period') || 'MONTH'

        const now = new Date()
        let currentStart: Date, currentEnd: Date, priorStart: Date, priorEnd: Date

        if (period === 'WEEK') {
            currentStart = new Date(now); currentStart.setDate(now.getDate() - 7)
            currentEnd = now
            priorStart = new Date(currentStart); priorStart.setFullYear(priorStart.getFullYear() - 1)
            priorEnd = new Date(currentEnd); priorEnd.setFullYear(priorEnd.getFullYear() - 1)
        } else if (period === 'QUARTER') {
            currentStart = new Date(now); currentStart.setDate(now.getDate() - 90)
            currentEnd = now
            priorStart = new Date(currentStart); priorStart.setFullYear(priorStart.getFullYear() - 1)
            priorEnd = new Date(currentEnd); priorEnd.setFullYear(priorEnd.getFullYear() - 1)
        } else {
            currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
            currentEnd = now
            priorStart = new Date(currentStart); priorStart.setFullYear(priorStart.getFullYear() - 1)
            priorEnd = new Date(currentEnd); priorEnd.setFullYear(priorEnd.getFullYear() - 1)
        }

        const franchiseId = user.franchiseId

        const [currentTx, priorTx] = await Promise.all([
            prisma.transaction.findMany({
                where: { franchiseId, status: 'COMPLETED', createdAt: { gte: currentStart, lte: currentEnd } },
                select: { total: true, subtotal: true }
            }),
            prisma.transaction.findMany({
                where: { franchiseId, status: 'COMPLETED', createdAt: { gte: priorStart, lte: priorEnd } },
                select: { total: true, subtotal: true }
            })
        ])

        const current = {
            revenue: Math.round(currentTx.reduce((s, t) => s + Number(t.total || 0), 0) * 100) / 100,
            transactions: currentTx.length,
            avgTicket: currentTx.length > 0
                ? Math.round((currentTx.reduce((s, t) => s + Number(t.total || 0), 0) / currentTx.length) * 100) / 100
                : 0
        }

        const prior = {
            revenue: Math.round(priorTx.reduce((s, t) => s + Number(t.total || 0), 0) * 100) / 100,
            transactions: priorTx.length,
            avgTicket: priorTx.length > 0
                ? Math.round((priorTx.reduce((s, t) => s + Number(t.total || 0), 0) / priorTx.length) * 100) / 100
                : 0
        }

        const growth = {
            revenue: prior.revenue > 0 ? Math.round(((current.revenue - prior.revenue) / prior.revenue) * 1000) / 10 : null,
            transactions: prior.transactions > 0 ? Math.round(((current.transactions - prior.transactions) / prior.transactions) * 1000) / 10 : null,
            avgTicket: prior.avgTicket > 0 ? Math.round(((current.avgTicket - prior.avgTicket) / prior.avgTicket) * 1000) / 10 : null
        }

        return ApiResponse.success({
            period,
            currentPeriod: { start: currentStart, end: currentEnd, ...current },
            priorPeriod: { start: priorStart, end: priorEnd, ...prior },
            growth,
            trend: (growth.revenue || 0) > 0 ? 'UP' : (growth.revenue || 0) < 0 ? 'DOWN' : 'FLAT'
        })
    } catch (error) {
        console.error('[YOY_GET]', error)
        return ApiResponse.error('Failed to generate YoY comparison', 500)
    }
}
