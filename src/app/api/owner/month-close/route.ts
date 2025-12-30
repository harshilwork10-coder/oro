import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate month-end close report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth()))
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        // Date range for the month
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0, 23, 59, 59)

        // Get all locations
        const locations = await prisma.location.findMany({
            where: franchiseId ? { franchiseId } : {},
            select: { id: true, name: true }
        })

        // Get all transactions for the month
        const transactionWhere: any = {
            createdAt: { gte: startDate, lte: endDate },
            status: 'COMPLETED'
        }

        if (franchiseId) {
            transactionWhere.cashDrawerSession = {
                location: { franchiseId }
            }
        }

        const transactions = await prisma.transaction.findMany({
            where: transactionWhere,
            include: {
                items: true,
                cashDrawerSession: {
                    select: { locationId: true }
                }
            }
        })

        // Calculate totals
        const summary = {
            totalSales: 0,
            totalTransactions: transactions.length,
            totalItems: 0,
            cashSales: 0,
            cardSales: 0,
            otherSales: 0,
            averageTicket: 0,
            voidCount: 0,
            refundTotal: 0
        }

        const byLocation: Record<string, any> = {}
        const byDay: Record<string, { sales: number, transactions: number }> = {}
        const byPaymentMethod: Record<string, number> = {}

        // Initialize location data
        locations.forEach(loc => {
            byLocation[loc.id] = {
                name: loc.name,
                sales: 0,
                transactions: 0,
                items: 0,
                cash: 0,
                card: 0
            }
        })

        // Process transactions
        for (const tx of transactions) {
            const total = Number(tx.total)
            const locationId = tx.cashDrawerSession?.locationId

            summary.totalSales += total
            summary.totalItems += tx.items?.length || 0

            // Payment method
            const method = tx.paymentMethod || 'OTHER'
            byPaymentMethod[method] = (byPaymentMethod[method] || 0) + total

            if (method === 'CASH') summary.cashSales += total
            else if (method === 'CARD') summary.cardSales += total
            else summary.otherSales += total

            // By location
            if (locationId && byLocation[locationId]) {
                byLocation[locationId].sales += total
                byLocation[locationId].transactions++
                byLocation[locationId].items += tx.items?.length || 0
                if (method === 'CASH') byLocation[locationId].cash += total
                else if (method === 'CARD') byLocation[locationId].card += total
            }

            // By day
            const dayKey = tx.createdAt.toISOString().split('T')[0]
            if (!byDay[dayKey]) byDay[dayKey] = { sales: 0, transactions: 0 }
            byDay[dayKey].sales += total
            byDay[dayKey].transactions++
        }

        summary.averageTicket = summary.totalTransactions > 0
            ? summary.totalSales / summary.totalTransactions
            : 0

        // Get voids/refunds
        const voids = await prisma.transaction.count({
            where: {
                ...transactionWhere,
                status: 'VOIDED'
            }
        })
        summary.voidCount = voids

        // Format location data
        const locationData = Object.entries(byLocation).map(([id, data]) => ({
            id,
            ...data,
            averageTicket: data.transactions > 0 ? data.sales / data.transactions : 0,
            percentOfTotal: summary.totalSales > 0
                ? (data.sales / summary.totalSales * 100).toFixed(1)
                : '0.0'
        })).sort((a, b) => b.sales - a.sales)

        // Format daily data
        const dailyData = Object.entries(byDay)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date))

        // Payment method breakdown
        const paymentBreakdown = Object.entries(byPaymentMethod).map(([method, amount]) => ({
            method,
            amount,
            percent: summary.totalSales > 0 ? (amount / summary.totalSales * 100).toFixed(1) : '0.0'
        }))

        // Comparison with previous month
        const prevStart = new Date(year, month - 1, 1)
        const prevEnd = new Date(year, month, 0, 23, 59, 59)

        const prevTransactions = await prisma.transaction.aggregate({
            where: {
                createdAt: { gte: prevStart, lte: prevEnd },
                status: 'COMPLETED',
                ...(franchiseId ? { cashDrawerSession: { location: { franchiseId } } } : {})
            },
            _sum: { total: true },
            _count: true
        })

        const comparison = {
            prevMonthSales: Number(prevTransactions._sum.total || 0),
            prevMonthTransactions: prevTransactions._count || 0,
            salesChange: 0,
            transactionChange: 0
        }

        if (comparison.prevMonthSales > 0) {
            comparison.salesChange = ((summary.totalSales - comparison.prevMonthSales) / comparison.prevMonthSales * 100)
        }
        if (comparison.prevMonthTransactions > 0) {
            comparison.transactionChange = ((summary.totalTransactions - comparison.prevMonthTransactions) / comparison.prevMonthTransactions * 100)
        }

        return NextResponse.json({
            month,
            year,
            monthName: startDate.toLocaleString('default', { month: 'long' }),
            dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
            summary,
            byLocation: locationData,
            dailyData,
            paymentBreakdown,
            comparison
        })

    } catch (error) {
        console.error('Month-end close error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Mark month as closed (for accounting)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Only owners can close months' }, { status: 403 })
        }

        const body = await request.json()
        const { month, year, notes } = body

        // In production, create a MonthClose record
        // For now, log the action
        console.log('Month closed:', { month, year, notes, closedBy: user.id })

        // Create audit event
        const franchiseId = user.franchiseId
        if (franchiseId) {
            try {
                // Get first location for audit
                const location = await prisma.location.findFirst({
                    where: { franchiseId },
                    select: { id: true }
                })

                if (location) {
                    await prisma.auditEvent.create({
                        data: {
                            locationId: location.id,
                            franchiseId,
                            eventType: 'MONTH_CLOSE',
                            severity: 'HIGH',
                            employeeId: user.id,
                            employeeName: user.name,
                            details: JSON.stringify({ month, year, notes })
                        }
                    })
                }
            } catch (e) {
                // Audit optional
            }
        }

        return NextResponse.json({
            success: true,
            message: `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year} has been closed`
        })

    } catch (error) {
        console.error('Month close POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

