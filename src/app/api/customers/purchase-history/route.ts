import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Customer Purchase History — Lookup by phone/email/ID */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const { phone, email, clientId } = await req.json()
        let client = null
        if (clientId) client = await prisma.client.findFirst({ where: { id: clientId, franchiseId: user.franchiseId } })
        else if (phone) client = await prisma.client.findFirst({ where: { phone, franchiseId: user.franchiseId } })
        else if (email) client = await prisma.client.findFirst({ where: { email, franchiseId: user.franchiseId } })
        if (!client) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

        const transactions = await prisma.transaction.findMany({
            where: { customerId: client.id, status: 'COMPLETED' },
            include: { items: { select: { name: true, quantity: true, unitPrice: true, total: true } }, location: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }, take: 20
        })
        const totalSpent = transactions.reduce((s, t) => s + Number(t.total || 0), 0)
        const visitCount = transactions.length, avgTicket = visitCount > 0 ? totalSpent / visitCount : 0
        const itemCounts: Record<string, { name: string; count: number }> = {}
        for (const tx of transactions) for (const item of tx.items) { const key = item.name; if (!itemCounts[key]) itemCounts[key] = { name: key, count: 0 }; itemCounts[key].count += item.quantity || 1 }
        const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5)

        return NextResponse.json({
            customer: { id: client.id, name: client.name, phone: client.phone, email: client.email, taxExempt: client.taxExempt },
            stats: { totalSpent: Math.round(totalSpent * 100) / 100, visitCount, avgTicket: Math.round(avgTicket * 100) / 100, topItems },
            recentTransactions: transactions
        })
    } catch (error: any) { console.error('[PURCHASE_HISTORY_POST]', error); return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 }) }
}
