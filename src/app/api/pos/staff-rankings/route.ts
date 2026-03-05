/**
 * Staff Rankings / Gamification API
 * GET /api/pos/staff-rankings
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'today'

    try {
        const now = new Date()
        const startDate = new Date()
        if (period === 'month') startDate.setDate(1)
        else if (period === 'week') startDate.setDate(now.getDate() - now.getDay())
        startDate.setHours(0, 0, 0, 0)

        // Use include (not select+include) to get lineItems
        const transactions = await prisma.transaction.findMany({
            where: { franchiseId, createdAt: { gte: startDate }, status: 'COMPLETED', employeeId: { not: null } },
            include: { lineItems: { select: { quantity: true, type: true, price: true } } }
        })

        const employees = await prisma.user.findMany({
            where: { franchiseId, role: { in: ['EMPLOYEE', 'MANAGER', 'OWNER'] }, isActive: true },
            select: { id: true, name: true }
        })
        const empNames: Record<string, string> = {}
        employees.forEach(e => { empNames[e.id] = e.name || 'Unknown' })

        const stats: Record<string, { revenue: number; tips: number; services: number; retail: number; count: number }> = {}
        transactions.forEach(t => {
            if (!t.employeeId) return
            if (!stats[t.employeeId]) stats[t.employeeId] = { revenue: 0, tips: 0, services: 0, retail: 0, count: 0 }
            const s = stats[t.employeeId]
            s.revenue += Number(t.subtotal || 0)
            s.tips += Number(t.tip || 0)
            s.count++
            t.lineItems?.forEach((li: any) => {
                if (li.type === 'SERVICE') s.services++
                if (li.type === 'PRODUCT') s.retail += Number(li.price || 0) * (li.quantity || 1)
            })
        })

        const rankings = Object.entries(stats)
            .map(([id, s]) => ({
                name: empNames[id] || 'Unknown',
                revenue: Math.round(s.revenue * 100) / 100,
                servicesCompleted: s.services,
                retailSold: Math.round(s.retail * 100) / 100,
                tipsEarned: Math.round(s.tips * 100) / 100,
                avgTicket: s.count > 0 ? Math.round((s.revenue / s.count) * 100) / 100 : 0
            }))
            .sort((a, b) => b.revenue - a.revenue)

        return NextResponse.json({ success: true, data: rankings })
    } catch (error) {
        console.error('[STAFF_RANKINGS_GET]', error)
        return NextResponse.json({ error: 'Failed to load rankings' }, { status: 500 })
    }
})
