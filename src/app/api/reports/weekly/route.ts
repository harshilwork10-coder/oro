import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate weekly report as HTML for PDF
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const autoPrint = searchParams.get('print') === 'true'
        const endDateParam = searchParams.get('endDate')

        const endDate = endDateParam ? new Date(endDateParam + 'T23:59:59') : new Date()
        const startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 6)
        startDate.setHours(0, 0, 0, 0)

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

        // Daily breakdown
        const dailyTotals = new Map<string, { sales: number, count: number }>()
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            dailyTotals.set(d.toISOString().split('T')[0], { sales: 0, count: 0 })
        }
        transactions.forEach(t => {
            const day = t.createdAt.toISOString().split('T')[0]
            const curr = dailyTotals.get(day) || { sales: 0, count: 0 }
            dailyTotals.set(day, { sales: curr.sales + Number(t.total || 0), count: curr.count + 1 })
        })

        // Payment breakdown
        const paymentTotals: Record<string, number> = { CASH: 0, CARD: 0, EBT: 0, OTHER: 0 }
        transactions.forEach(t => {
            const method = (t.paymentMethod || 'OTHER').toUpperCase()
            if (method in paymentTotals) paymentTotals[method] += Number(t.total || 0)
            else paymentTotals.OTHER += Number(t.total || 0)
        })

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weekly Sales Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; padding: 20px; }
        .container { max-width: 850px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #4a6fa5 0%, #5c7cba 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 20px; color: white; }
        .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 5px; }
        .header .store { font-size: 16px; opacity: 0.95; }
        .header .date { font-size: 13px; opacity: 0.9; margin-top: 8px; }
        .row { display: flex; gap: 16px; margin-bottom: 16px; }
        .row > * { flex: 1; }
        .card { background: white; border-radius: 10px; padding: 18px; border: 1px solid #e0e5eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #4a6fa5; margin-bottom: 14px; letter-spacing: 1px; }
        .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .metric { text-align: center; padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e8edf2; }
        .metric-value { font-size: 22px; font-weight: 700; color: #2d5a87; }
        .metric-label { font-size: 10px; color: #6b7c93; margin-top: 4px; text-transform: uppercase; }
        .metric.green .metric-value { color: #2e7d5a; }
        .metric.orange .metric-value { color: #c57830; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e8edf2; }
        th { font-size: 10px; text-transform: uppercase; color: #4a6fa5; font-weight: 600; }
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
            <h1>📅 Weekly Sales Report</h1>
            <div class="store">${storeName}</div>
            <div class="date">${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>

        <div class="card" style="margin-bottom: 16px;">
            <div class="card-title">💰 Week Summary</div>
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
                <div class="metric orange">
                    <div class="metric-value">$${(totalSales / 7).toFixed(2)}</div>
                    <div class="metric-label">Daily Avg</div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="card">
                <div class="card-title">📊 Daily Breakdown</div>
                <table>
                    <thead><tr><th>Date</th><th>Txns</th><th class="amount">Sales</th></tr></thead>
                    <tbody>
                    ${Array.from(dailyTotals.entries()).map(([day, data]) => `
                        <tr>
                            <td>${new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                            <td>${data.count}</td>
                            <td class="amount">$${data.sales.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="card">
                <div class="card-title">💳 Payment Methods</div>
                <table>
                    <thead><tr><th>Method</th><th class="amount">Total</th></tr></thead>
                    <tbody>
                        <tr><td>💵 Cash</td><td class="amount">$${paymentTotals.CASH.toFixed(2)}</td></tr>
                        <tr><td>💳 Card</td><td class="amount">$${paymentTotals.CARD.toFixed(2)}</td></tr>
                        <tr><td>🏦 EBT</td><td class="amount">$${paymentTotals.EBT.toFixed(2)}</td></tr>
                        ${paymentTotals.OTHER > 0 ? `<tr><td>📄 Other</td><td class="amount">$${paymentTotals.OTHER.toFixed(2)}</td></tr>` : ''}
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
        console.error('[WEEKLY_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
