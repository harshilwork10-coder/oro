// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * QuickBooks / Xero Accounting Integration API
 * 
 * GET  — Fetch accounting export data (sales journal, expenses, payroll)
 * POST — Export or sync data to QuickBooks/Xero
 * 
 * Export formats:
 *   - IIF (QuickBooks Desktop)
 *   - CSV (Universal / QuickBooks Online)
 *   - JSON (Xero API format)
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

        const start = new Date(startDate)
        const end = new Date(endDate + 'T23:59:59')

        // Sales data
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                createdAt: { gte: start, lte: end },
                status: 'COMPLETED',
            },
            select: {
                id: true,
                createdAt: true,
                subtotal: true,
                tax: true,
                total: true,
                paymentMethod: true,
                employee: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
        })

        // Aggregate by day
        const dailySales: Record<string, { date: string; sales: number; tax: number; cash: number; card: number; ebt: number; other: number; txCount: number }> = {}
        for (const tx of transactions) {
            const day = new Date(tx.createdAt).toISOString().split('T')[0]
            if (!dailySales[day]) {
                dailySales[day] = { date: day, sales: 0, tax: 0, cash: 0, card: 0, ebt: 0, other: 0, txCount: 0 }
            }
            const d = dailySales[day]
            d.sales += Number(tx.subtotal || 0)
            d.tax += Number(tx.tax || 0)
            d.txCount++
            const method = (tx.paymentMethod || '').toUpperCase()
            if (method === 'CASH') d.cash += Number(tx.total || 0)
            else if (method === 'CARD' || method === 'CREDIT' || method === 'DEBIT') d.card += Number(tx.total || 0)
            else if (method === 'EBT') d.ebt += Number(tx.total || 0)
            else d.other += Number(tx.total || 0)
        }

        // Employee hours for payroll
        const timeEntries = await prisma.timeEntry.findMany({
            where: {
                user: { franchiseId },
                clockIn: { gte: start, lte: end },
            },
            select: {
                clockIn: true,
                clockOut: true,
                user: { select: { name: true, email: true } },
            },
        })

        const payrollByEmployee: Record<string, { name: string; email: string; hours: number; entries: number }> = {}
        for (const entry of timeEntries) {
            const key = entry.user.email || entry.user.name
            if (!payrollByEmployee[key]) {
                payrollByEmployee[key] = { name: entry.user.name || '', email: entry.user.email || '', hours: 0, entries: 0 }
            }
            if (entry.clockOut) {
                const hrs = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000
                payrollByEmployee[key].hours += Math.round(hrs * 100) / 100
            }
            payrollByEmployee[key].entries++
        }

        // Purchase orders (expenses)
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                franchiseId,
                updatedAt: { gte: start, lte: end },
                status: 'RECEIVED',
            },
            select: {
                id: true,
                updatedAt: true,
                supplier: { select: { name: true } },
                items: { select: { quantity: true, unitCost: true } },
            },
        })

        const expenses = purchaseOrders.map(po => ({
            date: new Date(po.updatedAt).toISOString().split('T')[0],
            vendor: po.supplier?.name || 'Unknown',
            poNumber: `PO-${po.id.slice(-6).toUpperCase()}`,
            amount: Math.round(po.items.reduce((s, i) => s + (i.quantity * Number(i.unitCost || 0)), 0) * 100) / 100,
        }))

        const salesArray = Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date))
        const payrollArray = Object.values(payrollByEmployee)

        return NextResponse.json({
            period: { start: startDate, end: endDate },
            sales: {
                daily: salesArray,
                totalRevenue: Math.round(salesArray.reduce((s, d) => s + d.sales, 0) * 100) / 100,
                totalTax: Math.round(salesArray.reduce((s, d) => s + d.tax, 0) * 100) / 100,
                totalTransactions: transactions.length,
            },
            expenses: {
                items: expenses,
                totalExpenses: Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100,
            },
            payroll: {
                employees: payrollArray,
                totalHours: Math.round(payrollArray.reduce((s, e) => s + e.hours, 0) * 100) / 100,
            },
            exportFormats: [
                { id: 'QB_IIF', name: 'QuickBooks Desktop (IIF)', icon: '📗' },
                { id: 'QB_CSV', name: 'QuickBooks Online (CSV)', icon: '📊' },
                { id: 'XERO_CSV', name: 'Xero (CSV)', icon: '📘' },
                { id: 'GENERIC_CSV', name: 'Generic CSV', icon: '📄' },
            ],
        })

    } catch (error) {
        console.error('Accounting GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { action, format, startDate, endDate } = body

        if (action === 'export') {
            // Fetch data through own GET
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
            const dataRes = await fetch(`${baseUrl}/api/integrations/accounting?startDate=${startDate}&endDate=${endDate}`, {
                headers: { cookie: request.headers.get('cookie') || '' },
            })
            const data = await dataRes.json()

            if (format === 'QB_IIF') {
                // QuickBooks Desktop IIF format
                const lines: string[] = []
                lines.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO')
                lines.push('!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO')
                lines.push('!ENDTRNS')

                // Sales entries
                for (const day of data.sales?.daily || []) {
                    const fmtDate = day.date.replace(/-/g, '/')
                    lines.push(`TRNS\tDEPOSIT\t${fmtDate}\tUndeposited Funds\t\t${(day.sales + day.tax).toFixed(2)}\tDaily POS Sales`)
                    lines.push(`SPL\tDEPOSIT\t${fmtDate}\tSales Income\t\t${(-day.sales).toFixed(2)}\tNet Sales`)
                    lines.push(`SPL\tDEPOSIT\t${fmtDate}\tSales Tax Payable\t\t${(-day.tax).toFixed(2)}\tSales Tax`)
                    lines.push('ENDTRNS')
                }

                // Expense entries
                for (const exp of data.expenses?.items || []) {
                    const fmtDate = exp.date.replace(/-/g, '/')
                    lines.push(`TRNS\tCHECK\t${fmtDate}\tAccounts Payable\t${exp.vendor}\t${(-exp.amount).toFixed(2)}\t${exp.poNumber}`)
                    lines.push(`SPL\tCHECK\t${fmtDate}\tCost of Goods Sold\t${exp.vendor}\t${exp.amount.toFixed(2)}\tInventory Purchase`)
                    lines.push('ENDTRNS')
                }

                return new NextResponse(lines.join('\n'), {
                    headers: {
                        'Content-Type': 'text/plain',
                        'Content-Disposition': `attachment; filename="oro9-${startDate}-to-${endDate}.iif"`,
                    }
                })
            }

            if (format === 'QB_CSV' || format === 'XERO_CSV' || format === 'GENERIC_CSV') {
                // CSV format
                const rows: string[] = []
                rows.push('Date,Type,Account,Description,Debit,Credit,Tax,Reference')

                for (const day of data.sales?.daily || []) {
                    rows.push(`${day.date},Sale,Sales Income,Daily POS Sales (${day.txCount} tx),,${day.sales.toFixed(2)},${day.tax.toFixed(2)},`)
                    if (day.cash > 0) rows.push(`${day.date},Payment,Cash,Cash Payments,${day.cash.toFixed(2)},,,CASH`)
                    if (day.card > 0) rows.push(`${day.date},Payment,Credit Card,Card Payments,${day.card.toFixed(2)},,,CARD`)
                    if (day.ebt > 0) rows.push(`${day.date},Payment,EBT,EBT Payments,${day.ebt.toFixed(2)},,,EBT`)
                }

                for (const exp of data.expenses?.items || []) {
                    rows.push(`${exp.date},Expense,COGS,${exp.vendor} - ${exp.poNumber},${exp.amount.toFixed(2)},,,${exp.poNumber}`)
                }

                const ext = format === 'XERO_CSV' ? 'xero' : 'qb'
                return new NextResponse(rows.join('\n'), {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="oro9-${ext}-${startDate}-to-${endDate}.csv"`,
                    }
                })
            }

            return NextResponse.json({ error: 'Unknown format' }, { status: 400 })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Accounting POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
