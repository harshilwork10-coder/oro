// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Import items from CSV
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
        const { items, updateExisting } = body as {
            items: {
                name: string; barcode?: string; sku?: string; price: number;
                cost?: number; stock?: number; categoryName?: string;
                isEbtEligible?: boolean; isWicEligible?: boolean;
                isTobacco?: boolean; isAlcohol?: boolean; ageRestricted?: boolean
            }[]
            updateExisting?: boolean // If true, update items with matching barcode/SKU
        }

        if (!items?.length) return ApiResponse.badRequest('items array required')

        let created = 0, updated = 0, skipped = 0, errors: string[] = []

        for (const item of items) {
            try {
                if (!item.name || item.price == null) {
                    skipped++
                    errors.push(`Skipped: missing name or price`)
                    continue
                }

                // Check for existing item by barcode or SKU
                let existing = null
                if (item.barcode) {
                    existing = await prisma.item.findFirst({
                        where: { barcode: item.barcode, franchiseId: user.franchiseId }
                    })
                }
                if (!existing && item.sku) {
                    existing = await prisma.item.findFirst({
                        where: { sku: item.sku, franchiseId: user.franchiseId }
                    })
                }

                // Find or create category
                let categoryId = null
                if (item.categoryName) {
                    const cat = await prisma.unifiedCategory.findFirst({
                        where: { name: item.categoryName, franchiseId: user.franchiseId }
                    })
                    categoryId = cat?.id || null
                }

                if (existing && updateExisting) {
                    await prisma.item.update({
                        where: { id: existing.id },
                        data: {
                            name: item.name,
                            price: item.price,
                            cost: item.cost ?? undefined,
                            stock: item.stock ?? undefined,
                            isEbtEligible: item.isEbtEligible ?? undefined,
                            isWicEligible: item.isWicEligible ?? undefined,
                            isTobacco: item.isTobacco ?? undefined,
                            isAlcohol: item.isAlcohol ?? undefined,
                            ageRestricted: item.ageRestricted ?? undefined
                        }
                    })
                    updated++
                } else if (!existing) {
                    await prisma.item.create({
                        data: {
                            franchiseId: user.franchiseId,
                            name: item.name,
                            barcode: item.barcode || null,
                            sku: item.sku || null,
                            price: item.price,
                            cost: item.cost || 0,
                            stock: item.stock || 0,
                            type: 'PRODUCT',
                            isActive: true,
                            categoryId,
                            isEbtEligible: item.isEbtEligible || false,
                            isWicEligible: item.isWicEligible || false,
                            isTobacco: item.isTobacco || false,
                            isAlcohol: item.isAlcohol || false,
                            ageRestricted: item.ageRestricted || false
                        }
                    })
                    created++
                } else {
                    skipped++
                }
            } catch (e: any) {
                errors.push(`Error for ${item.name}: ${e.message}`)
                skipped++
            }
        }

        return ApiResponse.success({ created, updated, skipped, errors: errors.slice(0, 20), total: items.length })
    } catch (error) {
        console.error('[CSV_IMPORT_POST]', error)
        return ApiResponse.error('Failed to import items')
    }
}
