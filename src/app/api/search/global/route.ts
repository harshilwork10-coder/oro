import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Global Search — Unified search across items, customers, transactions */
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q')?.trim()
        if (!q || q.length < 2) return NextResponse.json({ data: { items: [], customers: [], transactions: [], total: 0 } })

        const locationFilter = user.locationId ? { locationId: user.locationId } : {}

        const [items, customers, transactions] = await Promise.all([
            prisma.item.findMany({ where: { ...locationFilter, OR: [{ name: { contains: q, mode: 'insensitive' } }, { barcode: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] }, select: { id: true, name: true, barcode: true, sku: true, price: true }, take: 8 }),
            prisma.client.findMany({ where: { ...locationFilter, OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }] }, select: { id: true, firstName: true, lastName: true, email: true, phone: true }, take: 5 }),
            prisma.transaction.findMany({ where: { ...locationFilter, OR: [{ id: { contains: q } }, { receiptNumber: { contains: q, mode: 'insensitive' } }] }, select: { id: true, receiptNumber: true, total: true, createdAt: true, status: true }, take: 5, orderBy: { createdAt: 'desc' } })
        ])

        return NextResponse.json({ data: {
            items: items.map(i => ({ ...i, type: 'ITEM' })),
            customers: customers.map(c => ({ ...c, type: 'CUSTOMER', name: `${c.firstName} ${c.lastName}` })),
            transactions: transactions.map(t => ({ ...t, type: 'TRANSACTION' })),
            total: items.length + customers.length + transactions.length
        } })
    } catch (error: any) {
        console.error('[SEARCH_GLOBAL]', error?.message?.slice(0, 120))
        return NextResponse.json({ data: { items: [], customers: [], transactions: [], total: 0 } })
    }
}
