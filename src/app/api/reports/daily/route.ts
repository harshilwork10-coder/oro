import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate comprehensive daily report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
        const autoPrint = searchParams.get('print') === 'true'
        const date = new Date(dateStr)
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return new NextResponse('No franchise found for this user.', {
                headers: { 'Content-Type': 'text/plain' }
            })
        }

        // Get franchise with settings
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: { settings: true }
        })

        const settings = franchise?.settings
        const storeName = settings?.storeDisplayName || franchise?.name || 'Store'
        const storeAddress = [
            settings?.storeAddress,
            settings?.storeCity && settings?.storeState
                ? `${settings.storeCity}, ${settings.storeState} ${settings.storeZip || ''}`
                : null
        ].filter(Boolean).join(', ') || ''

        // Fetch all transactions for the day
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startOfDay, lte: endOfDay },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            include: { employee: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        })

        // Voided/Refunded
        const voidedTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startOfDay, lte: endOfDay },
                status: { in: ['VOIDED', 'REFUNDED', 'CANCELLED'] }
            }
        })

        // Get departments - simple list without product relation
        let departments: { name: string }[] = []
        try {
            const depts = await prisma.department.findMany({
                where: { franchiseId: user.franchiseId },
                select: { name: true }
            })
            departments = depts
        } catch { /* Department model may not exist */ }

        // Get product categories for breakdown
        let productCategories: { category: string | null, count: number }[] = []
        try {
            const cats = await prisma.product.groupBy({
                by: ['category'],
                where: { franchiseId: user.franchiseId },
                _count: { id: true }
            })
            productCategories = cats.map(c => ({ category: c.category, count: c._count.id }))
        } catch { /* May fail if no products */ }

        // ===== LOTTERY DATA =====
        let lotteryData = { sales: 0, payouts: 0, net: 0, salesCount: 0, payoutsCount: 0 }
        try {
            const lotteryTxns = await prisma.lotteryTransaction.findMany({
                where: {
                    franchiseId: user.franchiseId,
                    createdAt: { gte: startOfDay, lte: endOfDay }
                }
            })
            const lotterySales = lotteryTxns.filter(t => t.type === 'SALE')
            const lotteryPayouts = lotteryTxns.filter(t => t.type === 'PAYOUT')
            lotteryData = {
                sales: lotterySales.reduce((sum, t) => sum + Number(t.amount || 0), 0),
                payouts: lotteryPayouts.reduce((sum, t) => sum + Number(t.amount || 0), 0),
                net: 0,
                salesCount: lotterySales.length,
                payoutsCount: lotteryPayouts.length
            }
            lotteryData.net = lotteryData.sales - lotteryData.payouts
        } catch { /* Lottery table may not exist */ }

        // ===== CORE METRICS =====
        const grossSales = transactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
        const totalTax = transactions.reduce((sum, t) => sum + Number(t.tax || 0), 0)
        const transactionCount = transactions.length
        const avgTransaction = transactionCount > 0 ? grossSales / transactionCount : 0

        // ===== PAYMENT BREAKDOWN =====
        let cashSales = 0, cardSales = 0, ebtSales = 0, otherSales = 0
        let cashCount = 0, cardCount = 0, ebtCount = 0, otherCount = 0
        transactions.forEach(t => {
            const method = (t.paymentMethod || '').toUpperCase()
            const total = Number(t.total || 0)
            if (method.includes('CASH')) { cashSales += total; cashCount++ }
            else if (method.includes('EBT')) { ebtSales += total; ebtCount++ }
            else if (method.includes('CARD') || method.includes('CREDIT') || method.includes('DEBIT')) { cardSales += total; cardCount++ }
            else { otherSales += total; otherCount++ }
        })

        // ===== EMPLOYEE PERFORMANCE =====
        const employeeSales: Map<string, { name: string, sales: number, transactions: number }> = new Map()
        transactions.forEach(t => {
            const name = t.employee?.name || 'Unknown'
            const existing = employeeSales.get(name) || { name, sales: 0, transactions: 0 }
            existing.sales += Number(t.total || 0)
            existing.transactions++
            employeeSales.set(name, existing)
        })
        const topEmployees = Array.from(employeeSales.values()).sort((a, b) => b.sales - a.sales)

        // ===== VOIDS & REFUNDS =====
        const voidTotal = voidedTransactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
        const voidCount = voidedTransactions.length

        // Generate HTML report
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Daily Sales Report - ${dateStr}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; padding: 20px; }
        .container { max-width: 850px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #4a6fa5 0%, #5c7cba 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 20px; color: white; }
        .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 5px; }
        .header .store { font-size: 16px; opacity: 0.95; }
        .header .address { font-size: 12px; opacity: 0.8; margin-top: 3px; }
        .header .date { font-size: 13px; opacity: 0.9; margin-top: 8px; }
        .row { display: flex; gap: 16px; margin-bottom: 16px; }
        .row > * { flex: 1; }
        .card { background: white; border-radius: 10px; padding: 18px; border: 1px solid #e0e5eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #4a6fa5; margin-bottom: 14px; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
        .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .metric { text-align: center; padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e8edf2; }
        .metric-value { font-size: 22px; font-weight: 700; color: #2d5a87; }
        .metric-label { font-size: 10px; color: #6b7c93; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric.green .metric-value { color: #2e7d5a; }
        .metric.orange .metric-value { color: #c57830; }
        .metric.red .metric-value { color: #c0392b; }
        .metric.purple .metric-value { color: #7b5aa6; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e8edf2; }
        th { font-size: 10px; text-transform: uppercase; color: #4a6fa5; font-weight: 600; letter-spacing: 0.5px; }
        td { font-size: 13px; color: #4a5568; }
        .amount { font-weight: 600; color: #2d5a87; text-align: right; }
        .footer { text-align: center; color: #8896a7; font-size: 11px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e0e5eb; }
        @media print { 
            body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .card { box-shadow: none; }
            .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Daily Sales Report</h1>
            <div class="store">${storeName}</div>
            ${storeAddress ? `<div class="address">${storeAddress}</div>` : ''}
            <div class="date">${new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        <div class="card" style="margin-bottom: 16px;">
            <div class="card-title">💰 Sales Summary</div>
            <div class="metric-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="metric green">
                    <div class="metric-value">$${grossSales.toFixed(2)}</div>
                    <div class="metric-label">Gross Sales</div>
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
                    <div class="metric-value">$${avgTransaction.toFixed(2)}</div>
                    <div class="metric-label">Avg Ticket</div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="card">
                <div class="card-title">💳 Payment Breakdown</div>
                <table>
                    <tr><td>💵 Cash</td><td>${cashCount}</td><td class="amount">$${cashSales.toFixed(2)}</td></tr>
                    <tr><td>💳 Card</td><td>${cardCount}</td><td class="amount">$${cardSales.toFixed(2)}</td></tr>
                    <tr><td>🏦 EBT</td><td>${ebtCount}</td><td class="amount">$${ebtSales.toFixed(2)}</td></tr>
                    ${otherCount > 0 ? `<tr><td>📋 Other</td><td>${otherCount}</td><td class="amount">$${otherSales.toFixed(2)}</td></tr>` : ''}
                </table>
            </div>
            
            <div class="card">
                <div class="card-title">🎰 Lottery</div>
                <div class="metric-grid">
                    <div class="metric green">
                        <div class="metric-value">$${lotteryData.sales.toFixed(2)}</div>
                        <div class="metric-label">Sales (${lotteryData.salesCount})</div>
                    </div>
                    <div class="metric red">
                        <div class="metric-value">$${lotteryData.payouts.toFixed(2)}</div>
                        <div class="metric-label">Payouts (${lotteryData.payoutsCount})</div>
                    </div>
                    <div class="metric ${lotteryData.net >= 0 ? 'green' : 'red'}" style="grid-column: span 2;">
                        <div class="metric-value">$${lotteryData.net.toFixed(2)}</div>
                        <div class="metric-label">Net ${lotteryData.net >= 0 ? 'Profit' : 'Loss'}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="card">
                <div class="card-title">🏪 Sales by Department</div>
                <table>
                    <thead><tr><th>Department</th><th>Products</th></tr></thead>
                    <tbody>
                    ${departments.length > 0
                ? departments.map(d => `<tr><td>${d.name}</td><td>-</td></tr>`).join('')
                : productCategories.map(c => `<tr><td>${c.category || 'Uncategorized'}</td><td>${c.count} products</td></tr>`).join('')
            }
                    ${departments.length === 0 && productCategories.length === 0 ? '<tr><td colspan="2" style="color:#888;">No department data</td></tr>' : ''}
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-title">👥 Employee Sales</div>
                <table>
                    <thead><tr><th>Name</th><th>Txn</th><th class="amount">Sales</th></tr></thead>
                    <tbody>
                    ${topEmployees.map(e => `<tr><td>${e.name}</td><td>${e.transactions}</td><td class="amount">$${e.sales.toFixed(2)}</td></tr>`).join('')}
                    ${topEmployees.length === 0 ? '<tr><td colspan="3" style="color:#888;">No sales data</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>

        ${voidCount > 0 ? `
        <div class="card">
            <div class="card-title">⚠️ Voids & Refunds</div>
            <div class="metric-grid" style="grid-template-columns: repeat(3, 1fr);">
                <div class="metric red">
                    <div class="metric-value">${voidCount}</div>
                    <div class="metric-label">Count</div>
                </div>
                <div class="metric red">
                    <div class="metric-value">$${voidTotal.toFixed(2)}</div>
                    <div class="metric-label">Total</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${transactionCount > 0 ? ((voidCount / transactionCount) * 100).toFixed(1) : '0'}%</div>
                    <div class="metric-label">Void Rate</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="footer">
            <p>Generated: ${new Date().toLocaleString()} • ORO 9 POS</p>
        </div>
    </div>
    
    ${autoPrint ? `
    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
        };
    </script>
    ` : ''}
</body>
</html>`

        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })

    } catch (error) {
        console.error('[DAILY_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
