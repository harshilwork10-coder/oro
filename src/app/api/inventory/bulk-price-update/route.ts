// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Bulk price update for a category or all items
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { categoryId, adjustmentType, adjustmentValue, preview } = body as {
            categoryId?: string // null = all items
            adjustmentType: string // PERCENT_INCREASE, PERCENT_DECREASE, FIXED_INCREASE, FIXED_DECREASE, SET_MARKUP
            adjustmentValue: number
            preview?: boolean // If true, just show what would change
        }

        if (!adjustmentType || adjustmentValue == null) {
            return ApiResponse.badRequest('adjustmentType and adjustmentValue required')
        }

        const where: any = { franchiseId: user.franchiseId, type: 'PRODUCT', isActive: true }
        if (categoryId) where.categoryId = categoryId

        const items = await prisma.item.findMany({
            where,
            select: { id: true, name: true, price: true, cost: true, category: { select: { name: true } } }
        })

        const changes = items.map(item => {
            const oldPrice = Number(item.price)
            let newPrice = oldPrice

            switch (adjustmentType) {
                case 'PERCENT_INCREASE':
                    newPrice = oldPrice * (1 + adjustmentValue / 100)
                    break
                case 'PERCENT_DECREASE':
                    newPrice = oldPrice * (1 - adjustmentValue / 100)
                    break
                case 'FIXED_INCREASE':
                    newPrice = oldPrice + adjustmentValue
                    break
                case 'FIXED_DECREASE':
                    newPrice = oldPrice - adjustmentValue
                    break
                case 'SET_MARKUP':
                    const cost = Number(item.cost || 0)
                    newPrice = cost > 0 ? cost * (1 + adjustmentValue / 100) : oldPrice
                    break
            }

            newPrice = Math.max(0, Math.round(newPrice * 100) / 100)

            return {
                itemId: item.id,
                name: item.name,
                category: item.category?.name,
                oldPrice,
                newPrice,
                change: Math.round((newPrice - oldPrice) * 100) / 100
            }
        })

        if (preview) {
            return ApiResponse.success({
                preview: true,
                itemCount: changes.length,
                changes: changes.slice(0, 100), // Show first 100
                totalImpact: Math.round(changes.reduce((s, c) => s + c.change, 0) * 100) / 100
            })
        }

        // Apply changes
        let updated = 0
        for (const change of changes) {
            if (change.oldPrice !== change.newPrice) {
                await prisma.item.update({
                    where: { id: change.itemId },
                    data: { price: change.newPrice }
                })

                // Log price change
                await (prisma as any).priceChangeLog.create({
                    data: {
                        itemId: change.itemId,
                        oldPrice: change.oldPrice,
                        newPrice: change.newPrice,
                        changedBy: user.id,
                        reason: `Bulk update: ${adjustmentType} ${adjustmentValue}`
                    }
                })
                updated++
            }
        }

        return ApiResponse.success({
            applied: true,
            itemsUpdated: updated,
            totalImpact: Math.round(changes.reduce((s, c) => s + c.change, 0) * 100) / 100
        })
    } catch (error) {
        console.error('[BULK_PRICE_POST]', error)
        return ApiResponse.error('Failed to update prices')
    }
}
