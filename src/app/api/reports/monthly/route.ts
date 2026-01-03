import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate monthly report as HTML for PDF
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const autoPrint = searchParams.get('print') === 'true'
        const monthParam = searchParams.get('month') // YYYY-MM format

        let year: number, month: number
        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            const [y, m] = monthParam.split('-').map(Number)
            year = y
            month = m - 1 // 0-indexed
        } else {
            const now = new Date()
            year = now.getFullYear()
            month = now.getMonth()
        }
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0, 23, 59, 59)
        const daysInMonth = endDate.getDate()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, franchise: { select: { name: true, settings: true } } }
        })

        if (!user?.franchiseId) {
            return new NextResponse('No franchise found.', { headers: { 'Content-Type': 'text/plain' } })
        }

        const settings = user.franchise?.settings as Record<string, string> | null
        const storeName = settings?.storeDisplayName || user.franchise?.name || 'Store'

        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startDate, lte: endDate },
                status: { in: ['COMPLETED', 'APPROVED'] }
            }
        })

        const totalSales = transactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
        const totalTax = transactions.reduce((sum, t) => sum + Number(t.tax || 0), 0)
        const transactionCount = transactions.length
        // daysInMonth already calculated above from endDate

        // Weekly breakdown
        const weeklyData: { sales: number, count: number }[] = [
            { sales: 0, count: 0 }, { sales: 0, count: 0 }, { sales: 0, count: 0 },
            { sales: 0, count: 0 }, { sales: 0, count: 0 }
        ]
        transactions.forEach(t => {
            const weekNum = Math.floor((t.createdAt.getDate() - 1) / 7)
            weeklyData[Math.min(weekNum, 4)].sales += Number(t.total || 0)
            weeklyData[Math.min(weekNum, 4)].count += 1
        })

        // Payment breakdown
        const paymentTotals: Record<string, number> = { CASH: 0, CARD: 0, EBT: 0, OTHER: 0 }
        transactions.forEach(t => {
            const method = (t.paymentMethod || 'OTHER').toUpperCase()
            if (method in paymentTotals) paymentTotals[method] += Number(t.total || 0)
            else paymentTotals.OTHER += Number(t.total || 0)
        })

        const monthName = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Monthly Sales Report - ${monthName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; padding: 20px; }
        .container { max-width: 850px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #5c4a9e 0%, #7b5aa6 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 20px; color: white; }
        .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 5px; }
        .header .store { font-size: 16px; opacity: 0.95; }
        .header .date { font-size: 13px; opacity: 0.9; margin-top: 8px; }
        .row { display: flex; gap: 16px; margin-bottom: 16px; }
        .row > * { flex: 1; }
        .card { background: white; border-radius: 10px; padding: 18px; border: 1px solid #e0e5eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #5c4a9e; margin-bottom: 14px; letter-spacing: 1px; }
        .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .metric { text-align: center; padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e8edf2; }
        .metric-value { font-size: 22px; font-weight: 700; color: #2d5a87; }
        .metric-label { font-size: 10px; color: #6b7c93; margin-top: 4px; text-transform: uppercase; }
        .metric.green .metric-value { color: #2e7d5a; }
        .metric.purple .metric-value { color: #7b5aa6; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e8edf2; }
        th { font-size: 10px; text-transform: uppercase; color: #5c4a9e; font-weight: 600; }
        td { font-size: 13px; color: #4a5568; }
        .amount { font-weight: 600; color: #2d5a87; text-align: right; }
        .footer { text-align: center; color: #8896a7; font-size: 11px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e0e5eb; }
        @media print { body { background: white; } .card { box-shadow: none; } }
    </style>
    ${autoPrint ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Monthly Sales Report</h1>
            <div class="store">${storeName}</div>
            <div class="date">${monthName}</div>
        </div>

        <div class="card" style="margin-bottom: 16px;">
            <div class="card-title">💰 Month Summary</div>
            <div class="metric-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="metric green">
                    <div class="metric-value">$${totalSales.toFixed(2)}</div>
                    <div class="metric-label">Total Sales</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${transactionCount}</div>
                    <div class="metric-label">Transactions</div>
                </div>
                <div class="metric">
                    <div class="metric-value">$${totalTax.toFixed(2)}</div>
                    <div class="metric-label">Tax Collected</div>
                </div>
                <div class="metric purple">
                    <div class="metric-value">$${(totalSales / daysInMonth).toFixed(2)}</div>
                    <div class="metric-label">Daily Avg</div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="card">
                <div class="card-title">📅 Weekly Breakdown</div>
                <table>
                    <thead><tr><th>Week</th><th>Days</th><th>Txns</th><th class="amount">Sales</th></tr></thead>
                    <tbody>
                        <tr><td>Week 1</td><td>1-7</td><td>${weeklyData[0].count}</td><td class="amount">$${weeklyData[0].sales.toFixed(2)}</td></tr>
                        <tr><td>Week 2</td><td>8-14</td><td>${weeklyData[1].count}</td><td class="amount">$${weeklyData[1].sales.toFixed(2)}</td></tr>
                        <tr><td>Week 3</td><td>15-21</td><td>${weeklyData[2].count}</td><td class="amount">$${weeklyData[2].sales.toFixed(2)}</td></tr>
                        <tr><td>Week 4</td><td>22-28</td><td>${weeklyData[3].count}</td><td class="amount">$${weeklyData[3].sales.toFixed(2)}</td></tr>
                        <tr><td>Week 5</td><td>29+</td><td>${weeklyData[4].count}</td><td class="amount">$${weeklyData[4].sales.toFixed(2)}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="card">
                <div class="card-title">💳 Payment Breakdown</div>
                <table>
                    <thead><tr><th>Method</th><th class="amount">Total</th></tr></thead>
                    <tbody>
                        <tr><td>💵 Cash</td><td class="amount">$${paymentTotals.CASH.toFixed(2)}</td></tr>
                        <tr><td>💳 Card</td><td class="amount">$${paymentTotals.CARD.toFixed(2)}</td></tr>
                        <tr><td>🏦 EBT</td><td class="amount">$${paymentTotals.EBT.toFixed(2)}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            Generated: ${new Date().toLocaleString()} • OroNext POS
        </div>
    </div>
</body>
</html>
`

        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html' }
        })

    } catch (error) {
        console.error('[MONTHLY_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
