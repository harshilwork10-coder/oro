/**
 * Payment Activity Log API
 *
 * GET — Payment method activity and trends from Transaction data
 *        (PaymentLog model doesn't exist — uses Transaction payment data instead)
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
        const paymentMethod = searchParams.get('paymentMethod')
        const since = new Date(); since.setDate(since.getDate() - days)

        const where: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            createdAt: { gte: since }
        }
        if (paymentMethod) where.paymentMethod = paymentMethod

        const transactions = await prisma.transaction.findMany({
            where,
            select: { total: true, paymentMethod: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        })

        // Summary by status and payment method
        const completed = transactions.filter(t => t.status === 'COMPLETED')
        const refunded = transactions.filter(t => t.status === 'REFUNDED')

        // Payment method breakdown
        const methodBreakdown: Record<string, { count: number; volume: number }> = {}
        for (const tx of completed) {
            const method = tx.paymentMethod || 'UNKNOWN'
            if (!methodBreakdown[method]) methodBreakdown[method] = { count: 0, volume: 0 }
            methodBreakdown[method].count++
            methodBreakdown[method].volume += Number(tx.total || 0)
        }

        // Round
        for (const key of Object.keys(methodBreakdown)) {
            methodBreakdown[key].volume = Math.round(methodBreakdown[key].volume * 100) / 100
        }

        // Daily trend
        const dailyTrend: Record<string, Record<string, number>> = {}
        for (const tx of completed) {
            const date = new Date(tx.createdAt).toISOString().split('T')[0]
            const method = tx.paymentMethod || 'UNKNOWN'
            if (!dailyTrend[date]) dailyTrend[date] = {}
            dailyTrend[date][method] = (dailyTrend[date][method] || 0) + Number(tx.total || 0)
        }

        return ApiResponse.success({
            summary: {
                totalPayments: completed.length,
                paymentVolume: Math.round(completed.reduce((s, t) => s + Number(t.total || 0), 0) * 100) / 100,
                totalRefunds: refunded.length,
                refundVolume: Math.round(refunded.reduce((s, t) => s + Math.abs(Number(t.total || 0)), 0) * 100) / 100
            },
            methodBreakdown,
            dailyTrend,
            periodDays: days
        })
    } catch (error) {
        console.error('[PAYMENT_ACTIVITY_GET]', error)
        return ApiResponse.error('Failed to fetch payment activity', 500)
    }
}
