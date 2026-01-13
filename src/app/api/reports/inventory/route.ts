import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate inventory report as HTML for PDF
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const autoPrint = searchParams.get('print') === 'true'

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, franchise: { select: { name: true, settings: true } } }
        })

        if (!user?.franchiseId) {
            return new NextResponse('No franchise found.', { headers: { 'Content-Type': 'text/plain' } })
        }

        const settings = user.franchise?.settings as Record<string, string> | null
        const storeName = settings?.storeDisplayName || user.franchise?.name || 'Store'

        const products = await prisma.product.findMany({
            where: { franchiseId: user.franchiseId },
            orderBy: { stock: 'asc' }
        })

        const lowStock = products.filter(p => p.stock <= 10)
        const outOfStock = products.filter(p => p.stock === 0)
        const totalValue = products.reduce((sum, p) => sum + (Number(p.price) * p.stock), 0)
        const totalCost = products.reduce((sum, p) => sum + (Number(p.cost || 0) * p.stock), 0)

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Inventory Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; padding: 20px; }
        .container { max-width: 850px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #c0392b 0%, #d44d3a 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 20px; color: white; }
        .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 5px; }
        .header .store { font-size: 16px; opacity: 0.95; }
        .header .date { font-size: 13px; opacity: 0.9; margin-top: 8px; }
        .row { display: flex; gap: 16px; margin-bottom: 16px; }
        .row > * { flex: 1; }
        .card { background: white; border-radius: 10px; padding: 18px; border: 1px solid #e0e5eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px; }
        .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #c0392b; margin-bottom: 14px; letter-spacing: 1px; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .metric { text-align: center; padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e8edf2; }
        .metric-value { font-size: 22px; font-weight: 700; color: #2d5a87; }
        .metric-label { font-size: 10px; color: #6b7c93; margin-top: 4px; text-transform: uppercase; }
        .metric.green .metric-value { color: #2e7d5a; }
        .metric.red .metric-value { color: #c0392b; }
        .metric.orange .metric-value { color: #c57830; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e8edf2; }
        th { font-size: 10px; text-transform: uppercase; color: #c0392b; font-weight: 600; }
        td { font-size: 13px; color: #4a5568; }
        .stock-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
        .stock-badge.critical { background: #fde8e8; color: #c0392b; }
        .stock-badge.low { background: #fef3e8; color: #c57830; }
        .amount { font-weight: 600; color: #2d5a87; text-align: right; }
        .footer { text-align: center; color: #8896a7; font-size: 11px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e0e5eb; }
        @media print { body { background: white; } .card { box-shadow: none; } }
    </style>
    ${autoPrint ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 Inventory Report</h1>
            <div class="store">${storeName}</div>
            <div class="date">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>

        <div class="card">
            <div class="card-title">📊 Summary</div>
            <div class="metric-grid">
                <div class="metric">
                    <div class="metric-value">${products.length}</div>
                    <div class="metric-label">Total Products</div>
                </div>
                <div class="metric red">
                    <div class="metric-value">${outOfStock.length}</div>
                    <div class="metric-label">Out of Stock</div>
                </div>
                <div class="metric orange">
                    <div class="metric-value">${lowStock.length}</div>
                    <div class="metric-label">Low Stock (≤10)</div>
                </div>
                <div class="metric green">
                    <div class="metric-value">$${totalValue.toFixed(0)}</div>
                    <div class="metric-label">Retail Value</div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="card" style="flex: 2;">
                <div class="card-title">⚠️ Low Stock Items (Top 20)</div>
                <table>
                    <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th class="amount">Price</th></tr></thead>
                    <tbody>
                    ${lowStock.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#888;">No low stock items</td></tr>' :
                lowStock.slice(0, 20).map(p => `
                        <tr>
                            <td>${p.name.substring(0, 35)}</td>
                            <td>${p.category || '-'}</td>
                            <td><span class="stock-badge ${p.stock === 0 ? 'critical' : 'low'}">${p.stock}</span></td>
                            <td class="amount">$${Number(p.price).toFixed(2)}</td>
                        </tr>`
                ).join('')
            }
                    </tbody>
                </table>
            </div>
            <div class="card" style="flex: 1;">
                <div class="card-title">🚫 Out of Stock</div>
                ${outOfStock.length === 0 ? '<p style="color:#888;text-align:center;padding:20px;">None!</p>' :
                `<ul style="list-style:none;font-size:13px;">
                        ${outOfStock.slice(0, 15).map(p => `<li style="padding:6px 0;border-bottom:1px solid #eee;">${p.name.substring(0, 25)}</li>`).join('')}
                        ${outOfStock.length > 15 ? `<li style="padding:6px 0;color:#888;">+${outOfStock.length - 15} more...</li>` : ''}
                    </ul>`
            }
            </div>
        </div>

        <div class="footer">
            Generated: ${new Date().toLocaleString()} • ORO 9 POS
        </div>
    </div>
</body>
</html>
`

        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html' }
        })

    } catch (error) {
        console.error('[INVENTORY_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
