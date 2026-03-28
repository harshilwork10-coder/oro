import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Labels — Generate barcode labels for items
 * POST /api/inventory/labels
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { itemIds, labelSize, showPrice, showBarcode, copies } = await req.json() as {
            itemIds: string[]; labelSize?: string; showPrice?: boolean; showBarcode?: boolean; copies?: number
        }
        if (!itemIds?.length) return NextResponse.json({ error: 'itemIds required' }, { status: 400 })

        const items = await prisma.item.findMany({
            where: { id: { in: itemIds }, franchiseId: user.franchiseId },
            select: { id: true, name: true, barcode: true, sku: true, price: true, cost: true, category: { select: { name: true } } }
        })

        const labels = items.map(item => ({
            itemId: item.id, name: item.name,
            barcode: item.barcode || item.sku || item.id,
            price: showPrice !== false ? `$${Number(item.price).toFixed(2)}` : null,
            category: item.category?.name || '', copies: copies || 1, size: labelSize || 'MEDIUM'
        }))

        return NextResponse.json({ labels, totalLabels: labels.reduce((s, l) => s + l.copies, 0) })
    } catch (error: any) {
        console.error('[LABELS_POST]', error)
        return NextResponse.json({ error: 'Failed to generate labels' }, { status: 500 })
    }
}
