// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Import vendor price book (CSV) → update item costs → log changes
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can import price books')
        }
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { items, vendorName } = body as {
            items: { barcode?: string; sku?: string; name?: string; newCost: number }[]
            vendorName?: string
        }

        if (!items || items.length === 0) return ApiResponse.badRequest('Items array required')

        const results = {
            updated: 0,
            skipped: 0,
            notFound: 0,
            errors: [] as string[]
        }

        for (const importItem of items) {
            try {
                // Find item by barcode or sku
                let dbItem = null
                if (importItem.barcode) {
                    dbItem = await prisma.item.findFirst({
                        where: { franchiseId: user.franchiseId, barcode: importItem.barcode }
                    })
                }
                if (!dbItem && importItem.sku) {
                    dbItem = await prisma.item.findFirst({
                        where: { franchiseId: user.franchiseId, sku: importItem.sku }
                    })
                }

                if (!dbItem) {
                    results.notFound++
                    results.errors.push(`Not found: ${importItem.barcode || importItem.sku || importItem.name}`)
                    continue
                }

                const oldCost = Number(dbItem.cost || 0)
                const newCost = Number(importItem.newCost)

                // Skip if cost hasn't changed
                if (Math.abs(oldCost - newCost) < 0.001) {
                    results.skipped++
                    continue
                }

                // Update cost
                await prisma.item.update({
                    where: { id: dbItem.id },
                    data: { cost: newCost }
                })

                // Log cost change
                await (prisma as any).priceChangeLog.create({
                    data: {
                        itemId: dbItem.id,
                        oldPrice: Number(dbItem.price),
                        newPrice: Number(dbItem.price), // Price not changed yet (auto-reprice runs separately)
                        oldCost,
                        newCost,
                        reason: `Vendor price book import${vendorName ? ` (${vendorName})` : ''}`,
                        source: 'IMPORT',
                        changedBy: user.id,
                        changedByName: user.name || user.email
                    }
                })

                results.updated++
            } catch (err) {
                results.errors.push(`Error updating ${importItem.barcode || importItem.sku}: ${err}`)
            }
        }

        return ApiResponse.success({
            ...results,
            message: `Updated ${results.updated} items, skipped ${results.skipped}, not found ${results.notFound}`
        })
    } catch (error) {
        console.error('[PRICE_BOOK_IMPORT]', error)
        return ApiResponse.error('Failed to import price book')
    }
}
