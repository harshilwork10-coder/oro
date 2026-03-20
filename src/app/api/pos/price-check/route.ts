// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Price check: scan barcode, get price + stock
export async function GET(request: NextRequest) {
    try {
        // This endpoint can work without auth (for price check kiosks)
        const { searchParams } = new URL(request.url)
        const barcode = searchParams.get('barcode')
        const sku = searchParams.get('sku')
        const locationId = searchParams.get('locationId')

        if (!barcode && !sku) return ApiResponse.badRequest('barcode or sku required')

        const where: any = {}
        if (barcode) where.barcode = barcode
        if (sku) where.sku = sku

        const item = await prisma.item.findFirst({
            where: { ...where, isActive: true },
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

        if (!item) return ApiResponse.notFound('Item not found')

        const locationPrice = item.locationOverrides?.[0]?.price
        const displayPrice = locationPrice ? Number(locationPrice) : Number(item.price)

        return ApiResponse.success({
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
    } catch (error) {
        console.error('[PRICE_CHECK_GET]', error)
        return ApiResponse.error('Failed to look up price')
    }
}
