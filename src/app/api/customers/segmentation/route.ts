import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Customer Segmentation — VIP / Regular / Occasional / Inactive */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '90')
    const since = new Date(Date.now() - days * 86400000)
    try {
        const customers = await prisma.client.findMany({ where: { franchiseId: user.franchiseId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true } })
        const txData = await prisma.transaction.groupBy({ by: ['customerId'], where: { status: 'COMPLETED', createdAt: { gte: since }, customerId: { not: null } }, _sum: { total: true }, _count: { id: true } })
        const txMap = new Map(txData.map(t => [t.customerId!, { total: Number(t._sum.total || 0), visits: t._count.id }]))

        const segmented = customers.map(c => {
            const data = txMap.get(c.id); const totalSpent = data?.total || 0; const visits = data?.visits || 0
            let segment: string
            if (totalSpent >= 500 && visits >= 10) segment = 'VIP'
            else if (totalSpent >= 200 || visits >= 5) segment = 'REGULAR'
            else if (visits >= 1) segment = 'OCCASIONAL'
            else segment = 'INACTIVE'
            return { id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), email: c.email, phone: c.phone, segment, totalSpent: Math.round(totalSpent * 100) / 100, visits, avgTicket: visits > 0 ? Math.round(totalSpent / visits * 100) / 100 : 0, daysSinceSignup: Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000) }
        }).sort((a, b) => b.totalSpent - a.totalSpent)

        const summary: Record<string, { count: number; revenue: number }> = {}
        for (const seg of ['VIP', 'REGULAR', 'OCCASIONAL', 'INACTIVE']) {
            const group = segmented.filter(s => s.segment === seg)
            summary[seg] = { count: group.length, revenue: Math.round(group.reduce((s, c) => s + c.totalSpent, 0) * 100) / 100 }
        }
        return NextResponse.json({ customers: segmented, summary, periodDays: days })
    } catch (error: any) { console.error('[SEGMENTATION_GET]', error); return NextResponse.json({ error: 'Failed to segment customers' }, { status: 500 }) }
}
