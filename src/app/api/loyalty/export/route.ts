import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/loyalty/export
 * 
 * CSV export for loyalty data.
 * Query: ?type=summary|adjustments|audit&date=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') || 'summary'
        const dateParam = searchParams.get('date')
        const franchiseId = user.franchiseId

        const startOfDay = dateParam ? new Date(dateParam) : new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay)
        endOfDay.setDate(endOfDay.getDate() + 1)
        const dateStr = startOfDay.toISOString().split('T')[0]

        let csv = ''
        let filename = ''

        if (type === 'summary') {
            // Daily loyalty summary export
            const txs = await prisma.pointsTransaction.findMany({
                where: { franchiseId, createdAt: { gte: startOfDay, lt: endOfDay } },
                orderBy: { createdAt: 'asc' },
                include: { member: { select: { phone: true, name: true } } }
            })

            csv = 'Date,Time,Type,Points,Member Phone,Member Name,Description\n'
            for (const tx of txs) {
                const time = new Date(tx.createdAt).toLocaleTimeString()
                csv += `${dateStr},${time},${tx.type},${tx.points},"${tx.member?.phone || ''}","${tx.member?.name || ''}","${(tx.description || '').replace(/"/g, '""')}"\n`
            }
            filename = `loyalty_summary_${dateStr}.csv`

        } else if (type === 'adjustments') {
            // Adjustment history export
            const adjustments = await prisma.pointsTransaction.findMany({
                where: { franchiseId, type: 'ADJUST' },
                orderBy: { createdAt: 'desc' },
                take: 500,
                include: { member: { select: { phone: true, name: true } } }
            })

            csv = 'Date,Time,Points,Member Phone,Member Name,Reason,Adjusted By\n'
            for (const adj of adjustments) {
                const d = new Date(adj.createdAt)
                let reason = '', adjustedBy = ''
                if (adj.metadata) {
                    try {
                        const m = JSON.parse(adj.metadata)
                        reason = m.reason || ''
                        adjustedBy = m.adjustedByName || ''
                    } catch { /* skip */ }
                }
                csv += `${d.toISOString().split('T')[0]},${d.toLocaleTimeString()},${adj.points},"${adj.member?.phone || ''}","${adj.member?.name || ''}","${reason.replace(/"/g, '""')}","${adjustedBy}"\n`
            }
            filename = `loyalty_adjustments.csv`

        } else if (type === 'audit') {
            // Audit/debug records export
            const txs = await prisma.pointsTransaction.findMany({
                where: { franchiseId, createdAt: { gte: startOfDay, lt: endOfDay } },
                orderBy: { createdAt: 'asc' },
                include: { member: { select: { phone: true, name: true } } }
            })

            csv = 'Date,Time,Type,Points,Member Phone,Member Name,Transaction ID,Eligible Total,Excluded Total,Engine,Description\n'
            for (const tx of txs) {
                const time = new Date(tx.createdAt).toLocaleTimeString()
                let eligible = '', excluded = '', engine = ''
                if (tx.metadata) {
                    try {
                        const m = JSON.parse(tx.metadata)
                        eligible = String(m.eligibleTotal || 0)
                        excluded = String(m.excludedTotal || 0)
                        engine = m.smartRewardsActive ? 'Smart Rewards' : 'Flat Rate'
                    } catch { /* skip */ }
                }
                csv += `${dateStr},${time},${tx.type},${tx.points},"${tx.member?.phone || ''}","${tx.member?.name || ''}","${tx.transactionId || ''}",${eligible},${excluded},"${engine}","${(tx.description || '').replace(/"/g, '""')}"\n`
            }
            filename = `loyalty_audit_${dateStr}.csv`
        } else {
            return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
        }

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        })
    } catch (error) {
        console.error('[LOYALTY_EXPORT]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
