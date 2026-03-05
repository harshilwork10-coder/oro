// @ts-nocheck
/**
 * Global Search API — Unified search across items, customers, transactions
 *
 * Single endpoint replaces searching 3+ separate APIs.
 * Returns categorized results with relevance ranking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { locationId: true },
    })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    if (!q || q.length < 2) return NextResponse.json({ data: { items: [], customers: [], transactions: [] } })

    const locationFilter = user?.locationId ? { locationId: user.locationId } : {}

    // Run all searches in parallel — one network call, 3 DB queries
    const [items, customers, transactions] = await Promise.all([
        prisma.item.findMany({
            where: {
                ...locationFilter,
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { barcode: { contains: q, mode: 'insensitive' } },
                    { sku: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: { id: true, name: true, barcode: true, sku: true, price: true },
            take: 8,
        }),
        prisma.client.findMany({
            where: {
                ...locationFilter,
                OR: [
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            take: 5,
        }),
        prisma.transaction.findMany({
            where: {
                ...locationFilter,
                OR: [
                    { id: { contains: q } },
                    { receiptNumber: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: { id: true, receiptNumber: true, total: true, createdAt: true, status: true },
            take: 5,
            orderBy: { createdAt: 'desc' },
        }),
    ])

    return NextResponse.json({
        data: {
            items: items.map(i => ({ ...i, type: 'ITEM' })),
            customers: customers.map(c => ({ ...c, type: 'CUSTOMER', name: `${c.firstName} ${c.lastName}` })),
            transactions: transactions.map(t => ({ ...t, type: 'TRANSACTION' })),
            total: items.length + customers.length + transactions.length,
        },
    })
}
