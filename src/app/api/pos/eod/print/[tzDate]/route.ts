import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { tzDate: string } }) {
    const { tzDate } = params
    const searchParams = req.nextUrl.searchParams
    const locationId = searchParams.get('locationId')
    
    if (!locationId || !tzDate) return new NextResponse('Missing required fields', { status: 400 })
    
    const eod = await prisma.endOfDayReport.findUnique({
        where: { locationId_tzDate: { locationId, tzDate } },
        include: { location: true, closingManager: true }
    })
    
    if (!eod) return new NextResponse('EOD Report not found for this date', { status: 404 })
    
    const payload = eod.reportPayload as any
    const fv = (val: number) => `$${Number(val).toFixed(2)}`

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Z-Report - ${tzDate}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace; /* Thermal printer aesthetic */
            margin: 0;
            padding: 20px;
            background: #fff;
            color: #000;
        }
        .receipt {
            max-width: 300px;
            margin: 0 auto;
        }
        h2, h3, h4 {
            text-align: center;
            margin: 5px 0;
        }
        .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
        }
        .line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 12px;
        }
        .bold { font-weight: bold; }
        .text-center { text-align: center; }
        .footer {
            margin-top: 20px;
            font-size: 10px;
            text-align: center;
        }
    </style>
</head>
<body onload="window.print()">
    <div class="receipt">
        <h2>${eod.location.name?.toUpperCase() || 'STORE Z-REPORT'}</h2>
        <div class="text-center" style="font-size: 12px; margin-bottom: 10px;">
            ${eod.location.address || ''}<br/>
            ${eod.location.phone || ''}
        </div>
        
        <h3>END OF DAY (Z-REPORT)</h3>
        <div class="text-center" style="font-size: 12px; margin-bottom: 15px;">
            Date: ${payload.tzDate}<br/>
            Closed: ${new Date(eod.closedAt).toLocaleString()}<br/>
            Manager: ${eod.closingManager.name || 'Unknown'} (${payload.closedByRole})
        </div>

        <div class="divider"></div>
        <h4>SALES LEDGER</h4>
        <div class="line"><span>Total Transactions</span><span>${payload.transactionCount}</span></div>
        <div class="line"><span>Gross Sales</span><span>${fv(payload.grossSales)}</span></div>
        <div class="line"><span>Cash Sales</span><span>${fv(payload.cashSales)}</span></div>
        <div class="line"><span>Card Sales</span><span>${fv(payload.cardSales)}</span></div>
        <div class="line"><span>Split Cash</span><span>${fv(payload.splitCash)}</span></div>
        <div class="line"><span>Split Card</span><span>${fv(payload.splitCard)}</span></div>
        <div class="divider"></div>
        <div class="line bold"><span>NET SALES</span><span>${fv(payload.netSales)}</span></div>
        <div class="divider"></div>

        <h4>DEDUCTIONS</h4>
        <div class="line"><span>Tax Collected</span><span>${fv(payload.tax)}</span></div>
        <div class="line"><span>Tips Total</span><span>${fv(payload.tips)}</span></div>
        <div class="line"><span>Total Refunds</span><span>${fv(payload.refunds)}</span></div>
        <div class="line"><span>(Cash Refunds)</span><span>${fv(payload.cashRefunds)}</span></div>
        <div class="line"><span>Total Voids</span><span>${fv(payload.voids)}</span></div>
        <div class="line"><span>Total Discounts</span><span>${fv(payload.discounts)}</span></div>
        
        <div class="divider"></div>
        <h4>CASH MOVEMENTS</h4>
        <div class="line"><span>No Sale Opens</span><span>${payload.noSaleCount}</span></div>
        <div class="line"><span>Paid In</span><span>${fv(payload.paidInTotal)}</span></div>
        <div class="line"><span>Paid Out</span><span>${fv(payload.paidOutTotal)}</span></div>
        <div class="line"><span>Cash Drops</span><span>${fv(payload.cashDropsTotal)}</span></div>
        
        <div class="divider"></div>
        <h4>RECONCILIATION</h4>
        <div class="line"><span>Starting Base (Sum)</span><span>${fv(payload.openingCashTotal)}</span></div>
        <div class="line bold"><span>EXPECTED CASH</span><span>${fv(payload.expectedCash)}</span></div>
        <div class="line bold"><span>COUNTED CASH</span><span>${fv(payload.actualCash)}</span></div>
        <div class="line bold"><span>VARIANCE</span><span>${payload.variance > 0 ? '+' : ''}${fv(payload.variance)}</span></div>
        
        ${payload.varianceNote ? `
            <div class="divider"></div>
            <h4>VARIANCE NOTE</h4>
            <div style="font-size: 11px; font-style: italic;">"${payload.varianceNote}"</div>
            <div style="font-size: 11px; text-align: right; margin-top: 4px;">- Approved by Manager</div>
        ` : ''}

        <div class="divider"></div>
        <div class="footer">
            Snapshot Generated At:<br/>
            ${new Date(payload.generatedAt).toLocaleString()}<br/>
            ID: ${eod.id}
        </div>
    </div>
</body>
</html>
    `

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' }})
}
