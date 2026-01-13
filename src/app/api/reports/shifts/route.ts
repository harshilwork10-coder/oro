import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate shifts report as HTML for PDF
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

        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true }
        })

        const shifts = await prisma.cashDrawerSession.findMany({
            where: {
                locationId: { in: locations.map(l => l.id) },
                startTime: { gte: startDate, lte: endDate }
            },
            include: { employee: true, location: true },
            orderBy: { startTime: 'desc' }
        })

        const activeCount = shifts.filter(s => s.status === 'OPEN').length
        const completedCount = shifts.filter(s => s.status === 'CLOSED').length
        const totalHours = shifts.reduce((sum, s) => {
            if (s.endTime) {
                return sum + (s.endTime.getTime() - s.startTime.getTime()) / 3600000
            }
            return sum
        }, 0)

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Shift Reports</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; padding: 20px; }
        .container { max-width: 850px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #c57830 0%, #d4883a 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 20px; color: white; }
        .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 5px; }
        .header .store { font-size: 16px; opacity: 0.95; }
        .header .date { font-size: 13px; opacity: 0.9; margin-top: 8px; }
        .card { background: white; border-radius: 10px; padding: 18px; border: 1px solid #e0e5eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px; }
        .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #c57830; margin-bottom: 14px; letter-spacing: 1px; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .metric { text-align: center; padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e8edf2; }
        .metric-value { font-size: 22px; font-weight: 700; color: #2d5a87; }
        .metric-label { font-size: 10px; color: #6b7c93; margin-top: 4px; text-transform: uppercase; }
        .metric.green .metric-value { color: #2e7d5a; }
        .metric.orange .metric-value { color: #c57830; }
        .active-badge { display: inline-block; padding: 2px 8px; background: #2e7d5a; color: white; border-radius: 10px; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e8edf2; }
        th { font-size: 10px; text-transform: uppercase; color: #c57830; font-weight: 600; }
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
            <h1>👤 Shift Reports</h1>
            <div class="store">${storeName}</div>
            <div class="date">Last 7 Days</div>
        </div>

        <div class="card">
            <div class="card-title">📊 Summary</div>
            <div class="metric-grid">
                <div class="metric">
                    <div class="metric-value">${shifts.length}</div>
                    <div class="metric-label">Total Shifts</div>
                </div>
                <div class="metric green">
                    <div class="metric-value">${activeCount}</div>
                    <div class="metric-label">Active Now</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${completedCount}</div>
                    <div class="metric-label">Completed</div>
                </div>
                <div class="metric orange">
                    <div class="metric-value">${totalHours.toFixed(1)}h</div>
                    <div class="metric-label">Total Hours</div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">📋 Recent Shifts</div>
            <table>
                <thead><tr><th>Date</th><th>Employee</th><th>Duration</th><th>Status</th><th class="amount">End Cash</th></tr></thead>
                <tbody>
                ${shifts.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#888;">No shifts in the last 7 days</td></tr>' :
                shifts.map(s => {
                    const duration = s.endTime
                        ? ((s.endTime.getTime() - s.startTime.getTime()) / 3600000).toFixed(1) + 'h'
                        : '-'
                    return `
                        <tr>
                            <td>${s.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                            <td>${s.employee?.name || 'Unknown'}</td>
                            <td>${duration}</td>
                            <td>${s.status === 'CLOSED' ? 'Closed' : '<span class="active-badge">Active</span>'}</td>
                            <td class="amount">${s.endingCash ? '$' + Number(s.endingCash).toFixed(2) : '-'}</td>
                        </tr>`
                }).join('')
            }
                </tbody>
            </table>
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
        console.error('[SHIFTS_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
