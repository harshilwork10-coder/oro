'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Payment type breakdown report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)

        const transactions = await prisma.transaction.findMany({
            where: { locationId, status: 'COMPLETED', createdAt: { gte: since } },
            select: { total: true, paymentMethod: true, createdAt: true }
        })

        const breakdown: Record<string, { count: number; total: number }> = {}
        const dailyTrend: Record<string, Record<string, number>> = {}

        for (const tx of transactions) {
            const method = tx.paymentMethod || 'OTHER'
            const dateKey = new Date(tx.createdAt).toISOString().split('T')[0]

            if (!breakdown[method]) breakdown[method] = { count: 0, total: 0 }
            breakdown[method].count++
            breakdown[method].total += Number(tx.total || 0)

            if (!dailyTrend[dateKey]) dailyTrend[dateKey] = {}
            dailyTrend[dateKey][method] = (dailyTrend[dateKey][method] || 0) + Number(tx.total || 0)
        }

        // Round totals
        Object.values(breakdown).forEach(b => { b.total = Math.round(b.total * 100) / 100 })

        const grandTotal = Object.values(breakdown).reduce((s, b) => s + b.total, 0)

        return ApiResponse.success({
            breakdown: Object.entries(breakdown).map(([method, data]) => ({
                method,
                ...data,
                percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 1000) / 10 : 0
            })).sort((a, b) => b.total - a.total),
            dailyTrend,
            grandTotal: Math.round(grandTotal * 100) / 100,
            periodDays: days
        })
    } catch (error) {
        console.error('[PAYMENT_TYPE_GET]', error)
        return ApiResponse.error('Failed to generate report')
    }
}
