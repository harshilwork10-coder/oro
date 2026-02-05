import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// AUDIT STANDARD: Proper decimal rounding to prevent penny errors
function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100
}

// Standardized transaction statuses for financial reports (CPA-compliant)
const COMPLETED_STATUSES = ['COMPLETED', 'APPROVED'] as const

// GET - Generate quarterly report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const franchiseId = searchParams.get('franchiseId')
        const quarter = parseInt(searchParams.get('quarter') || '0') // 1-4
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

        if (!franchiseId) {
            return NextResponse.json({ error: 'franchiseId required' }, { status: 400 })
        }

        // Calculate quarter date range
        const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3)
        const startMonth = (currentQuarter - 1) * 3
        const startDate = new Date(year, startMonth, 1)
        const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)

        // Get transactions for the quarter
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: { in: COMPLETED_STATUSES as unknown as string[] },
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                id: true,
                total: true,
                subtotal: true,
                tax: true,
                tipAmount: true,
                paymentMethod: true,
                createdAt: true,
                employee: {
                    select: { name: true }
                }
            }
        })

        // Get previous quarter for comparison
        const prevStartDate = new Date(year, startMonth - 3, 1)
        const prevEndDate = new Date(year, startMonth, 0, 23, 59, 59, 999)

        const prevTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: { in: COMPLETED_STATUSES as unknown as string[] },
                createdAt: {
                    gte: prevStartDate,
                    lte: prevEndDate
                }
            },
            select: {
                total: true
            }
        })

        // Calculate quarterly summary
        let totalSales = 0
        let cashSales = 0
        let cardSales = 0
        let tips = 0
        let taxCollected = 0

        transactions.forEach(tx => {
            const total = Number(tx.total) || 0
            totalSales += total
            tips += Number(tx.tipAmount) || 0
            taxCollected += Number(tx.tax) || 0

            if (tx.paymentMethod === 'CASH') {
                cashSales += total
            } else {
                cardSales += total
            }
        })

        // Calculate monthly breakdown
        const monthlyBreakdown: { month: string; sales: number; transactions: number }[] = []
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        for (let i = 0; i < 3; i++) {
            const monthIndex = startMonth + i
            const monthTransactions = transactions.filter(tx => {
                const txMonth = new Date(tx.createdAt).getMonth()
                return txMonth === monthIndex
            })

            monthlyBreakdown.push({
                month: monthNames[monthIndex],
                sales: roundCurrency(monthTransactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0)),
                transactions: monthTransactions.length
            })
        }

        // Calculate comparison with previous quarter
        const prevTotal = prevTransactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0)
        const salesChange = prevTotal > 0 ? ((totalSales - prevTotal) / prevTotal) * 100 : 0
        const transactionChange = prevTransactions.length > 0
            ? ((transactions.length - prevTransactions.length) / prevTransactions.length) * 100
            : 0

        // Get refunds
        const refunds = await prisma.transaction.aggregate({
            where: {
                franchiseId,
                status: 'REFUNDED',
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: {
                total: true
            }
        })

        const quarterLabel = `Q${currentQuarter} ${year}`

        return NextResponse.json({
            quarter: currentQuarter,
            year,
            quarterLabel,
            summary: {
                totalSales: roundCurrency(totalSales),
                transactionCount: transactions.length,
                avgTicket: transactions.length > 0 ? roundCurrency(totalSales / transactions.length) : 0,
                cashSales: roundCurrency(cashSales),
                cardSales: roundCurrency(cardSales),
                tips: roundCurrency(tips),
                taxCollected: roundCurrency(taxCollected),
                refunds: roundCurrency(Number(refunds._sum.total) || 0)
            },
            comparison: {
                salesChange: roundCurrency(salesChange),
                transactionChange: roundCurrency(transactionChange)
            },
            monthlyBreakdown
        })

    } catch (error) {
        console.error('Quarterly report error:', error)
        return NextResponse.json({ error: 'Failed to generate quarterly report' }, { status: 500 })
    }
}
