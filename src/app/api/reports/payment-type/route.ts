/**
 * Payment Type Breakdown Report API
 *
 * GET — Revenue split by payment method with daily trend data
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)

        const transactions = await prisma.transaction.findMany({
            where: { franchiseId: user.franchiseId, status: 'COMPLETED', createdAt: { gte: since } },
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

        return NextResponse.json({
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
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
