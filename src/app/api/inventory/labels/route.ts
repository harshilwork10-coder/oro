'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Generate barcode labels for items
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { itemIds, labelSize, showPrice, showBarcode, copies } = body as {
            itemIds: string[]
            labelSize?: string // 'SMALL' (1x1), 'MEDIUM' (2x1), 'SHELF' (3x1.5)
            showPrice?: boolean
            showBarcode?: boolean
            copies?: number
        }

        if (!itemIds?.length) return ApiResponse.badRequest('itemIds required')

        const items = await prisma.item.findMany({
            where: { id: { in: itemIds }, franchiseId: user.franchiseId },
            select: {
                id: true, name: true, barcode: true, sku: true,
                price: true, cost: true,
                category: { select: { name: true } }
            }
        })

        const labels = items.map(item => ({
            itemId: item.id,
            name: item.name,
            barcode: item.barcode || item.sku || item.id,
            price: showPrice !== false ? `$${Number(item.price).toFixed(2)}` : null,
            category: item.category?.name || '',
            copies: copies || 1,
            size: labelSize || 'MEDIUM'
        }))

        return ApiResponse.success({ labels, totalLabels: labels.reduce((s, l) => s + l.copies, 0) })
    } catch (error) {
        console.error('[LABELS_POST]', error)
        return ApiResponse.error('Failed to generate labels')
    }
}
