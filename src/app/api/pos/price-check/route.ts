import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Price Check — Scan barcode or SKU, get price + stock
 * GET /api/pos/price-check?barcode=xxx or ?sku=xxx
 *
 * Works without auth (for price check kiosks).
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const barcode = searchParams.get('barcode')
    const sku = searchParams.get('sku')
    const locationId = searchParams.get('locationId')

    if (!barcode && !sku) {
        return NextResponse.json({ error: 'barcode or sku required' }, { status: 400 })
    }

    try {
        const where: any = { isActive: true }
        if (barcode) where.barcode = barcode
        if (sku) where.sku = sku

        const item = await prisma.item.findFirst({
            where,
            select: {
                id: true, name: true, barcode: true, price: true,
                description: true, isWeighted: true, unitOfMeasure: true,
                stock: true,
                category: { select: { name: true } },
                locationOverrides: locationId ? {
                    where: { locationId },
                    select: { price: true }
                } : false
            }
        })

        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

        const locationPrice = (item as any).locationOverrides?.[0]?.price
        const displayPrice = locationPrice ? Number(locationPrice) : Number(item.price)

        return NextResponse.json({
            name: item.name,
            price: `$${displayPrice.toFixed(2)}`,
            priceNumeric: displayPrice,
            barcode: item.barcode,
            category: item.category?.name,
            inStock: (item.stock || 0) > 0,
            description: item.description,
            isWeighted: item.isWeighted,
            unitOfMeasure: item.unitOfMeasure
        })
    } catch (error: any) {
        console.error('[PRICE_CHECK_GET]', error)
        return NextResponse.json({ error: 'Failed to look up price' }, { status: 500 })
    }
}
