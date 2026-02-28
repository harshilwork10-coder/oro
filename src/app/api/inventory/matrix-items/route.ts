'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Create a matrix item (parent + variants)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { parentName, categoryId, variants } = body as {
            parentName: string
            categoryId?: string
            variants: { name: string; sku: string; barcode?: string; price: number; cost?: number; stock?: number; attributes: Record<string, string> }[]
        }

        if (!parentName || !variants?.length) {
            return ApiResponse.badRequest('parentName and variants required')
        }

        // Create parent item
        const parent = await prisma.item.create({
            data: {
                franchiseId: user.franchiseId,
                name: parentName,
                type: 'PRODUCT',
                isActive: true,
                isMatrix: true,
                price: variants[0].price,
                categoryId: categoryId || null
            }
        })

        // Create variant items
        const createdVariants = []
        for (const v of variants) {
            const variant = await prisma.item.create({
                data: {
                    franchiseId: user.franchiseId,
                    name: `${parentName} - ${v.name}`,
                    sku: v.sku,
                    barcode: v.barcode || null,
                    price: v.price,
                    cost: v.cost || 0,
                    stock: v.stock || 0,
                    type: 'PRODUCT',
                    isActive: true,
                    parentItemId: parent.id,
                    variantAttributes: JSON.stringify(v.attributes),
                    categoryId: categoryId || null
                }
            })
            createdVariants.push(variant)
        }

        return ApiResponse.success({
            parent: { id: parent.id, name: parent.name },
            variants: createdVariants.map(v => ({ id: v.id, name: v.name, sku: v.sku, price: Number(v.price) })),
            totalVariants: createdVariants.length
        })
    } catch (error) {
        console.error('[MATRIX_POST]', error)
        return ApiResponse.error('Failed to create matrix item')
    }
}

// GET — Get matrix item with all variants
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const parentId = searchParams.get('parentId')

        if (parentId) {
            const parent = await prisma.item.findFirst({
                where: { id: parentId, franchiseId: user.franchiseId, isMatrix: true }
            })
            if (!parent) return ApiResponse.notFound('Matrix item not found')

            const variants = await prisma.item.findMany({
                where: { parentItemId: parentId, isActive: true },
                orderBy: { name: 'asc' }
            })

            return ApiResponse.success({
                parent: { id: parent.id, name: parent.name },
                variants: variants.map(v => ({
                    id: v.id, name: v.name, sku: v.sku, barcode: v.barcode,
                    price: Number(v.price), cost: Number(v.cost || 0), stock: v.stock || 0,
                    attributes: v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
                }))
            })
        }

        // List all matrix parents
        const matrices = await prisma.item.findMany({
            where: { franchiseId: user.franchiseId, isMatrix: true, isActive: true },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })

        return ApiResponse.success({ matrices })
    } catch (error) {
        console.error('[MATRIX_GET]', error)
        return ApiResponse.error('Failed to fetch matrix items')
    }
}
