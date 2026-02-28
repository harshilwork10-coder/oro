'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Start a physical inventory count session
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { items, categoryId, notes } = body

        // items: [{ itemId, countedQty }]
        if (!items?.length) return ApiResponse.badRequest('Items with counted quantities required')

        const results = []
        let totalVariance = 0
        let totalCostVariance = 0

        for (const counted of items) {
            const item = await prisma.item.findFirst({
                where: { id: counted.itemId, franchiseId: user.franchiseId }
            })
            if (!item) continue

            const systemQty = item.stock || 0
            const countedQty = counted.countedQty || 0
            const variance = countedQty - systemQty
            const costVariance = variance * Number(item.cost || 0)

            results.push({
                itemId: item.id,
                name: item.name,
                barcode: item.barcode,
                systemQty,
                countedQty,
                variance,
                costVariance: Math.round(costVariance * 100) / 100
            })

            totalVariance += Math.abs(variance)
            totalCostVariance += costVariance

            // Create stock adjustment if variance exists
            if (variance !== 0) {
                await prisma.stockAdjustment.create({
                    data: {
                        locationId,
                        itemId: item.id,
                        quantity: variance,
                        reason: 'PHYSICAL_COUNT',
                        notes: notes || `Physical count adjustment: system=${systemQty}, counted=${countedQty}`,
                        adjustedBy: user.id
                    }
                })

                // Update stock to match count
                await prisma.item.update({
                    where: { id: item.id },
                    data: { stock: countedQty }
                })
            }
        }

        // Log as audit event
        await (prisma as any).auditEvent.create({
            data: {
                locationId,
                userId: user.id,
                type: 'PHYSICAL_COUNT',
                data: JSON.stringify({
                    countedBy: user.name,
                    categoryId,
                    itemCount: items.length,
                    totalVariance,
                    totalCostVariance: Math.round(totalCostVariance * 100) / 100
                })
            }
        })

        return ApiResponse.success({
            results,
            summary: {
                itemsCounted: results.length,
                itemsWithVariance: results.filter(r => r.variance !== 0).length,
                totalVarianceUnits: totalVariance,
                totalCostVariance: Math.round(totalCostVariance * 100) / 100
            }
        })
    } catch (error) {
        console.error('[PHYSICAL_COUNT_POST]', error)
        return ApiResponse.error('Failed to process count')
    }
}

// GET — Get items for counting (optionally filtered by category)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const categoryId = searchParams.get('categoryId')

        const where: any = { franchiseId: user.franchiseId, type: 'PRODUCT', isActive: true }
        if (categoryId) where.categoryId = categoryId

        const items = await prisma.item.findMany({
            where,
            select: {
                id: true, name: true, barcode: true, sku: true,
                stock: true, cost: true,
                category: { select: { name: true } }
            },
            orderBy: { name: 'asc' }
        })

        return ApiResponse.success({ items })
    } catch (error) {
        console.error('[PHYSICAL_COUNT_GET]', error)
        return ApiResponse.error('Failed to fetch items')
    }
}
