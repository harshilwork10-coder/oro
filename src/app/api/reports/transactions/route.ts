/**
 * Transaction Report API
 *
 * GET — Returns paginated transaction list with filtering
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
            select: { role: true, franchiseId: true }
        })

        if (!user?.franchiseId) return ApiResponse.error('No franchise', 400)

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '7')
        const status = searchParams.get('status') || undefined
        const paymentMethod = searchParams.get('payment') || undefined
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const since = new Date(); since.setDate(since.getDate() - days)
        const franchiseId = user.franchiseId

        const where: any = {
            franchiseId,
            createdAt: { gte: since }
        }
        if (status) where.status = status
        if (paymentMethod) where.paymentMethod = paymentMethod

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    lineItems: { select: { productNameSnapshot: true, serviceNameSnapshot: true, quantity: true, total: true } },
                    client: { select: { firstName: true, lastName: true } },
                    employee: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.transaction.count({ where })
        ])

        // Summary stats
        const allTx = await prisma.transaction.findMany({
            where: { franchiseId, createdAt: { gte: since } },
            select: { status: true, total: true, paymentMethod: true }
        })

        const completed = allTx.filter(t => t.status === 'COMPLETED')
        const totalRevenue = completed.reduce((s, t) => s + Number(t.total || 0), 0)
        const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0

        // Payment method breakdown
        const paymentBreakdown: Record<string, { count: number; total: number }> = {}
        completed.forEach(t => {
            const m = t.paymentMethod || 'OTHER'
            if (!paymentBreakdown[m]) paymentBreakdown[m] = { count: 0, total: 0 }
            paymentBreakdown[m].count++
            paymentBreakdown[m].total += Number(t.total || 0)
        })

        return ApiResponse.success({
            transactions: transactions.map(t => ({
                id: t.id,
                invoiceNumber: t.invoiceNumber,
                date: t.createdAt,
                status: t.status,
                paymentMethod: t.paymentMethod,
                total: Number(t.total || 0),
                tax: Number(t.tax || 0),
                customer: t.client ? `${t.client.firstName || ''} ${t.client.lastName || ''}`.trim() : null,
                employee: t.employee?.name || null,
                itemCount: t.lineItems?.length || 0
            })),
            summary: {
                totalTransactions: allTx.length,
                completedCount: completed.length,
                refundedCount: allTx.filter(t => t.status === 'REFUNDED').length,
                voidedCount: allTx.filter(t => t.status === 'VOIDED').length,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                avgTicket: Math.round(avgTicket * 100) / 100,
                paymentBreakdown
            },
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            periodDays: days
        })
    } catch (error) {
        console.error('[TRANSACTIONS_REPORT]', error)
        return ApiResponse.error('Failed to generate transaction report', 500)
    }
}
