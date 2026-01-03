import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate lottery report as HTML for PDF
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

        const lotteryTxns = await prisma.lotteryTransaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startDate, lte: endDate }
            },
            include: { pack: { include: { game: true } } },
            orderBy: { createdAt: 'desc' }
        })

        const sales = lotteryTxns.filter(t => t.type === 'SALE')
        const payouts = lotteryTxns.filter(t => t.type === 'PAYOUT')
        const totalSales = sales.reduce((sum, t) => sum + Number(t.amount || 0), 0)
        const totalPayouts = payouts.reduce((sum, t) => sum + Number(t.amount || 0), 0)
        const net = totalSales - totalPayouts

        const gameStats = new Map<string, { sales: number, payouts: number, count: number }>()
        lotteryTxns.forEach(t => {
            const name = t.pack?.game?.gameName || 'Unknown Game'
            const existing = gameStats.get(name) || { sales: 0, payouts: 0, count: 0 }
            if (t.type === 'SALE') {
                existing.sales += Number(t.amount || 0)
                existing.count += 1
            } else {
                existing.payouts += Number(t.amount || 0)
            }
            gameStats.set(name, existing)
        })

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Lottery Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; padding: 20px; }
        .container { max-width: 850px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #7b5aa6 0%, #9366b3 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 20px; color: white; }
        .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 5px; }
        .header .store { font-size: 16px; opacity: 0.95; }
        .header .date { font-size: 13px; opacity: 0.9; margin-top: 8px; }
        .row { display: flex; gap: 16px; margin-bottom: 16px; }
        .row > * { flex: 1; }
        .card { background: white; border-radius: 10px; padding: 18px; border: 1px solid #e0e5eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #7b5aa6; margin-bottom: 14px; letter-spacing: 1px; }
        .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .metric { text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e8edf2; }
        .metric-value { font-size: 24px; font-weight: 700; color: #2d5a87; }
        .metric-label { font-size: 10px; color: #6b7c93; margin-top: 4px; text-transform: uppercase; }
        .metric.green .metric-value { color: #2e7d5a; }
        .metric.red .metric-value { color: #c0392b; }
        .metric.purple .metric-value { color: #7b5aa6; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e8edf2; }
        th { font-size: 10px; text-transform: uppercase; color: #7b5aa6; font-weight: 600; }
        td { font-size: 13px; color: #4a5568; }
        .amount { font-weight: 600; color: #2d5a87; text-align: right; }
        .amount.green { color: #2e7d5a; }
        .amount.red { color: #c0392b; }
        .footer { text-align: center; color: #8896a7; font-size: 11px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e0e5eb; }
        @media print { body { background: white; } .card { box-shadow: none; } }
    </style>
    ${autoPrint ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎰 Lottery Report</h1>
            <div class="store">${storeName}</div>
            <div class="date">Last 7 Days</div>
        </div>

        <div class="card" style="margin-bottom: 16px;">
            <div class="card-title">💰 Summary</div>
            <div class="metric-grid">
                <div class="metric green">
                    <div class="metric-value">$${totalSales.toFixed(2)}</div>
                    <div class="metric-label">Total Sales (${sales.length})</div>
                </div>
                <div class="metric red">
                    <div class="metric-value">$${totalPayouts.toFixed(2)}</div>
                    <div class="metric-label">Total Payouts (${payouts.length})</div>
                </div>
                <div class="metric ${net >= 0 ? 'green' : 'red'}">
                    <div class="metric-value">$${net.toFixed(2)}</div>
                    <div class="metric-label">${net >= 0 ? 'Net Profit' : 'Net Loss'}</div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">🎮 By Game</div>
            <table>
                <thead><tr><th>Game</th><th>Tickets Sold</th><th class="amount">Sales</th><th class="amount">Payouts</th><th class="amount">Net</th></tr></thead>
                <tbody>
                ${gameStats.size === 0 ? '<tr><td colspan="5" style="text-align:center;color:#888;">No lottery activity</td></tr>' :
                Array.from(gameStats.entries()).map(([name, stats]) => {
                    const gameNet = stats.sales - stats.payouts
                    return `
                        <tr>
                            <td>${name}</td>
                            <td>${stats.count}</td>
                            <td class="amount green">$${stats.sales.toFixed(2)}</td>
                            <td class="amount red">$${stats.payouts.toFixed(2)}</td>
                            <td class="amount ${gameNet >= 0 ? 'green' : 'red'}">$${gameNet.toFixed(2)}</td>
                        </tr>`
                }).join('')
            }
                </tbody>
            </table>
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
        console.error('[LOTTERY_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
