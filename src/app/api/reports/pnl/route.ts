/**
 * P&L Report API
 *
 * GET — Real P&L from transaction data (no hardcoded percentages)
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
        const franchiseId = user.franchiseId

        const transactions = await prisma.transaction.findMany({
            where: { franchiseId, createdAt: { gte: since } },
            select: { status: true, total: true, tax: true, tip: true, subtotal: true }
        })

        const completed = transactions.filter(t => t.status === 'COMPLETED')
        const refunded = transactions.filter(t => t.status === 'REFUNDED')
        const voided = transactions.filter(t => t.status === 'VOIDED')

        const grossRevenue = completed.reduce((s, t) => s + Number(t.total || 0), 0)
        const totalTax = completed.reduce((s, t) => s + Number(t.tax || 0), 0)
        const totalTips = completed.reduce((s, t) => s + Number(t.tip || 0), 0)
        const refundAmount = refunded.reduce((s, t) => s + Math.abs(Number(t.total || 0)), 0)
        const voidAmount = voided.reduce((s, t) => s + Math.abs(Number(t.total || 0)), 0)

        const netSales = grossRevenue - refundAmount - voidAmount
        const revenueBeforeTax = netSales - totalTax

        // Try to get labor cost from payroll
        const payroll = await prisma.payrollEntry.aggregate({
            where: {
                payrollRun: {
                    periodStart: { gte: since },
                    status: { in: ['FINALIZED', 'PAID'] }
                }
            },
            _sum: { grossPay: true, hourlyWages: true }
        }).catch(() => null)

        const laborCost = Number(payroll?._sum?.grossPay || 0)
        const hasLaborData = laborCost > 0

        return NextResponse.json({
            period: { days, since: since.toISOString() },
            revenue: {
                grossRevenue: Math.round(grossRevenue * 100) / 100,
                refunds: Math.round(refundAmount * 100) / 100,
                voids: Math.round(voidAmount * 100) / 100,
                netSales: Math.round(netSales * 100) / 100,
                taxCollected: Math.round(totalTax * 100) / 100,
                tips: Math.round(totalTips * 100) / 100,
                revenueBeforeTax: Math.round(revenueBeforeTax * 100) / 100
            },
            expenses: {
                laborCost: Math.round(laborCost * 100) / 100,
                hasLaborData,
                // COGS requires inventory cost tracking - flagged as unavailable
                cogsAvailable: false,
                operatingExpensesAvailable: false
            },
            profit: {
                grossProfit: Math.round(revenueBeforeTax * 100) / 100,
                netProfit: hasLaborData
                    ? Math.round((revenueBeforeTax - laborCost) * 100) / 100
                    : null,
                laborPct: netSales > 0 && hasLaborData
                    ? Math.round((laborCost / netSales) * 10000) / 100
                    : null
            },
            transactionCounts: {
                completed: completed.length,
                refunded: refunded.length,
                voided: voided.length
            }
        })
    } catch (error) {
        console.error('[PNL_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate P&L report' }, { status: 500 })
    }
}
