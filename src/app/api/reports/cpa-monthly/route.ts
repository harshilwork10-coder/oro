import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate CPA Monthly Tax Report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const monthStr = searchParams.get('month') // e.g., "2026-01" 
        const format = searchParams.get('format') || 'html'
        const autoPrint = searchParams.get('print') === 'true'

        const now = new Date()
        let year = now.getFullYear()
        let month = now.getMonth() // 0-indexed

        if (monthStr) {
            const [y, m] = monthStr.split('-').map(Number)
            year = y
            month = m - 1 // Convert to 0-indexed
        }

        const startOfMonth = new Date(year, month, 1)
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
        const monthName = startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return new NextResponse('No franchise found for this user.', {
                headers: { 'Content-Type': 'text/plain' }
            })
        }

        // Get franchise with settings for store info
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: {
                settings: true,
                locations: { select: { id: true, name: true, address: true } }
            }
        })

        const settings = franchise?.settings
        const storeName = settings?.storeDisplayName || franchise?.name || 'Store'
        const storeAddress = [
            settings?.storeAddress,
            settings?.storeAddress2,
            settings?.storeCity && settings?.storeState
                ? `${settings.storeCity}, ${settings.storeState} ${settings.storeZip || ''}`
                : null
        ].filter(Boolean).join('\n') || 'Address not configured'
        const storePhone = settings?.storePhone || ''

        // Fetch all completed transactions for the month
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startOfMonth, lte: endOfMonth },
                status: { in: ['COMPLETED', 'APPROVED'] }
            }
        })

        // Voided/Refunded
        const voidedTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startOfMonth, lte: endOfMonth },
                status: { in: ['VOIDED', 'REFUNDED', 'CANCELLED'] }
            }
        })

        // ===== CPA METRICS =====
        const grossSales = transactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
        const salesTaxCollected = transactions.reduce((sum, t) => sum + Number(t.tax || 0), 0)
        const netSales = grossSales - salesTaxCollected
        const transactionCount = transactions.length
        const refundTotal = voidedTransactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
        const refundCount = voidedTransactions.length

        // Payment method breakdown (important for reconciliation)
        let cashTotal = 0, cardTotal = 0, ebtTotal = 0, otherTotal = 0
        let cashCount = 0, cardCount = 0, ebtCount = 0, otherCount = 0
        transactions.forEach(t => {
            const method = (t.paymentMethod || '').toUpperCase()
            const total = Number(t.total || 0)
            if (method.includes('CASH')) { cashTotal += total; cashCount++ }
            else if (method.includes('EBT')) { ebtTotal += total; ebtCount++ }
            else if (method.includes('CARD') || method.includes('CREDIT') || method.includes('DEBIT')) { cardTotal += total; cardCount++ }
            else { otherTotal += total; otherCount++ }
        })

        // Weekly breakdown for CPA
        const weeklyData: { week: string, sales: number, tax: number, count: number }[] = []
        const weeksInMonth = Math.ceil(endOfMonth.getDate() / 7)
        for (let w = 0; w < weeksInMonth; w++) {
            const weekStart = new Date(year, month, w * 7 + 1)
            const weekEnd = new Date(year, month, Math.min((w + 1) * 7, endOfMonth.getDate()), 23, 59, 59)
            const weekTxns = transactions.filter(t => t.createdAt >= weekStart && t.createdAt <= weekEnd)
            weeklyData.push({
                week: `Week ${w + 1} (${weekStart.getDate()}-${weekEnd.getDate()})`,
                sales: weekTxns.reduce((s, t) => s + Number(t.total || 0), 0),
                tax: weekTxns.reduce((s, t) => s + Number(t.tax || 0), 0),
                count: weekTxns.length
            })
        }

        // Daily totals for detailed CPA review
        const dailyData: { date: string, sales: number, tax: number, count: number }[] = []
        for (let d = 1; d <= endOfMonth.getDate(); d++) {
            const dayStart = new Date(year, month, d)
            const dayEnd = new Date(year, month, d, 23, 59, 59)
            const dayTxns = transactions.filter(t => t.createdAt >= dayStart && t.createdAt <= dayEnd)
            if (dayTxns.length > 0) {
                dailyData.push({
                    date: `${month + 1}/${d}/${year}`,
                    sales: dayTxns.reduce((s, t) => s + Number(t.total || 0), 0),
                    tax: dayTxns.reduce((s, t) => s + Number(t.tax || 0), 0),
                    count: dayTxns.length
                })
            }
        }

        // ===== HTML FORMAT (PDF-ready for CPA) =====
        if (format === 'html') {
            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CPA Monthly Tax Report - ${monthName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; background: #fff; color: #333; padding: 40px; font-size: 12px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
        .store-info { display: flex; justify-content: space-between; }
        .store-info .left { text-align: left; }
        .store-info .right { text-align: right; }
        .store-name { font-size: 16px; font-weight: bold; }
        .report-period { font-size: 14px; margin-top: 10px; }
        
        .section { margin-bottom: 30px; }
        .section-title { font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 8px 12px; border: 1px solid #333; border-bottom: none; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; text-align: left; border: 1px solid #333; }
        th { background: #f5f5f5; font-weight: bold; }
        td.amount { text-align: right; font-family: 'Courier New', monospace; }
        tr.total { background: #e8e8e8; font-weight: bold; }
        tr.subtotal { background: #f5f5f5; }
        
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .summary-box { border: 1px solid #333; padding: 15px; }
        .summary-box h3 { font-size: 12px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .summary-item { display: flex; justify-content: space-between; padding: 4px 0; }
        .summary-item.highlight { font-weight: bold; font-size: 14px; background: #fffde7; padding: 8px; margin: 5px -15px; }
        
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; font-size: 10px; text-align: center; color: #666; }
        .signature-line { margin-top: 60px; display: flex; justify-content: space-between; }
        .signature { border-top: 1px solid #333; width: 200px; padding-top: 5px; text-align: center; }
        
        @media print { 
            body { padding: 20px; } 
            .no-print { display: none; }
        }
    </style>
    ${autoPrint ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 MONTHLY SALES TAX REPORT</h1>
            <div class="store-info">
                <div class="left">
                    <div class="store-name">${storeName}</div>
                    <div style="white-space: pre-line; margin-top: 5px;">${storeAddress}</div>
                    ${storePhone ? `<div style="margin-top: 5px;">Phone: ${storePhone}</div>` : ''}
                </div>
                <div class="right">
                    <div class="report-period"><strong>Report Period:</strong></div>
                    <div style="font-size: 16px; font-weight: bold;">${monthName}</div>
                    <div style="margin-top: 10px;">Generated: ${new Date().toLocaleDateString()}</div>
                </div>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-box">
                <h3>💰 Sales Summary</h3>
                <div class="summary-item"><span>Gross Sales:</span><span>$${grossSales.toFixed(2)}</span></div>
                <div class="summary-item"><span>Less: Sales Tax:</span><span>($${salesTaxCollected.toFixed(2)})</span></div>
                <div class="summary-item highlight"><span>NET TAXABLE SALES:</span><span>$${netSales.toFixed(2)}</span></div>
                <div class="summary-item"><span>Transaction Count:</span><span>${transactionCount}</span></div>
            </div>
            <div class="summary-box">
                <h3>🏛️ Tax Liability</h3>
                <div class="summary-item highlight"><span>SALES TAX COLLECTED:</span><span>$${salesTaxCollected.toFixed(2)}</span></div>
                <div class="summary-item"><span>Refunds/Voids:</span><span>${refundCount} ($${refundTotal.toFixed(2)})</span></div>
                <div class="summary-item"><span>Avg Daily Sales:</span><span>$${(grossSales / endOfMonth.getDate()).toFixed(2)}</span></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">💳 Payment Method Breakdown</div>
            <table>
                <thead>
                    <tr><th>Payment Method</th><th>Transactions</th><th class="amount">Amount</th><th class="amount">% of Total</th></tr>
                </thead>
                <tbody>
                    <tr><td>Cash</td><td>${cashCount}</td><td class="amount">$${cashTotal.toFixed(2)}</td><td class="amount">${grossSales > 0 ? ((cashTotal / grossSales) * 100).toFixed(1) : 0}%</td></tr>
                    <tr><td>Credit/Debit Card</td><td>${cardCount}</td><td class="amount">$${cardTotal.toFixed(2)}</td><td class="amount">${grossSales > 0 ? ((cardTotal / grossSales) * 100).toFixed(1) : 0}%</td></tr>
                    <tr><td>EBT</td><td>${ebtCount}</td><td class="amount">$${ebtTotal.toFixed(2)}</td><td class="amount">${grossSales > 0 ? ((ebtTotal / grossSales) * 100).toFixed(1) : 0}%</td></tr>
                    ${otherCount > 0 ? `<tr><td>Other</td><td>${otherCount}</td><td class="amount">$${otherTotal.toFixed(2)}</td><td class="amount">${((otherTotal / grossSales) * 100).toFixed(1)}%</td></tr>` : ''}
                    <tr class="total"><td>TOTAL</td><td>${transactionCount}</td><td class="amount">$${grossSales.toFixed(2)}</td><td class="amount">100%</td></tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">📅 Weekly Summary</div>
            <table>
                <thead>
                    <tr><th>Period</th><th>Transactions</th><th class="amount">Gross Sales</th><th class="amount">Tax Collected</th></tr>
                </thead>
                <tbody>
                    ${weeklyData.map(w => `<tr><td>${w.week}</td><td>${w.count}</td><td class="amount">$${w.sales.toFixed(2)}</td><td class="amount">$${w.tax.toFixed(2)}</td></tr>`).join('')}
                    <tr class="total"><td>MONTH TOTAL</td><td>${transactionCount}</td><td class="amount">$${grossSales.toFixed(2)}</td><td class="amount">$${salesTaxCollected.toFixed(2)}</td></tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">📋 Daily Detail (For Audit Trail)</div>
            <table>
                <thead>
                    <tr><th>Date</th><th>Transactions</th><th class="amount">Gross Sales</th><th class="amount">Tax</th></tr>
                </thead>
                <tbody>
                    ${dailyData.map(d => `<tr><td>${d.date}</td><td>${d.count}</td><td class="amount">$${d.sales.toFixed(2)}</td><td class="amount">$${d.tax.toFixed(2)}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>

        <div class="signature-line">
            <div class="signature">Prepared By</div>
            <div class="signature">Date</div>
            <div class="signature">CPA Review</div>
        </div>

        <div class="footer">
            <p>This report is generated from POS transaction data and is intended for tax preparation purposes.</p>
            <p>System: OroNext POS | Report Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center; padding: 15px; background: #f0f0f0; border-radius: 8px;">
            <strong>💡 Tip:</strong> Press <kbd>Ctrl</kbd>+<kbd>P</kbd> to print or save as PDF
        </div>
    </div>
</body>
</html>`
            return new NextResponse(html, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            })
        }

        // ===== TEXT FORMAT =====
        const report = `
═══════════════════════════════════════════════════════════════════════
                      CPA MONTHLY TAX REPORT
═══════════════════════════════════════════════════════════════════════
Store: ${storeName}
Address: ${storeAddress.replace(/\n/g, ', ')}
Phone: ${storePhone}
Report Period: ${monthName}
Generated: ${new Date().toLocaleString()}
═══════════════════════════════════════════════════════════════════════

SALES SUMMARY
─────────────────────────────────────────
  Gross Sales:           $${grossSales.toFixed(2)}
  Less: Sales Tax:       ($${salesTaxCollected.toFixed(2)})
  ─────────────────────────────────────
  NET TAXABLE SALES:     $${netSales.toFixed(2)}

  Transaction Count:     ${transactionCount}
  Refunds/Voids:         ${refundCount} ($${refundTotal.toFixed(2)})

TAX LIABILITY
─────────────────────────────────────────
  SALES TAX COLLECTED:   $${salesTaxCollected.toFixed(2)}

PAYMENT BREAKDOWN
─────────────────────────────────────────
  Cash:      $${cashTotal.toFixed(2)} (${cashCount} txn)
  Card:      $${cardTotal.toFixed(2)} (${cardCount} txn)
  EBT:       $${ebtTotal.toFixed(2)} (${ebtCount} txn)
  Other:     $${otherTotal.toFixed(2)} (${otherCount} txn)

WEEKLY SUMMARY
─────────────────────────────────────────
${weeklyData.map(w => `  ${w.week.padEnd(20)} $${w.sales.toFixed(2).padStart(10)}  Tax: $${w.tax.toFixed(2)}`).join('\n')}

═══════════════════════════════════════════════════════════════════════
                         END OF REPORT
═══════════════════════════════════════════════════════════════════════
`
        return new NextResponse(report, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="cpa-monthly-report-${year}-${String(month + 1).padStart(2, '0')}.txt"`
            }
        })

    } catch (error) {
        console.error('[CPA_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
