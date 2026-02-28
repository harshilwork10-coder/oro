'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Create a kit/bundle item (sell as 1 SKU, deducts components)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { name, price, barcode, components, categoryId } = body as {
            name: string
            price: number
            barcode?: string
            components: { itemId: string; quantity: number }[]
            categoryId?: string
        }

        if (!name || !price || !components?.length) {
            return ApiResponse.badRequest('name, price, and components required')
        }

        // Create the bundle as an Item with components stored as tag-alongs
        const bundle = await prisma.item.create({
            data: {
                franchiseId: user.franchiseId,
                name,
                price,
                barcode: barcode || null,
                type: 'PRODUCT',
                isActive: true,
                isBundle: true,
                bundleComponents: JSON.stringify(components),
                categoryId: categoryId || null
            }
        })

        return ApiResponse.success({ bundle })
    } catch (error) {
        console.error('[KIT_BUNDLE_POST]', error)
        return ApiResponse.error('Failed to create kit/bundle')
    }
}

// GET — Get bundle details with component availability
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const bundleId = searchParams.get('id')

        if (bundleId) {
            const bundle = await prisma.item.findFirst({
                where: { id: bundleId, franchiseId: user.franchiseId, isBundle: true }
            })
            if (!bundle) return ApiResponse.notFound('Bundle not found')

            const components = JSON.parse(bundle.bundleComponents || '[]') as { itemId: string; quantity: number }[]
            const componentItems = await prisma.item.findMany({
                where: { id: { in: components.map(c => c.itemId) } },
                select: { id: true, name: true, stock: true, cost: true }
            })

            const itemMap = new Map(componentItems.map(i => [i.id, i]))
            const details = components.map(c => {
                const item = itemMap.get(c.itemId)
                return {
                    itemId: c.itemId,
                    name: item?.name || 'Unknown',
                    requiredQty: c.quantity,
                    inStock: item?.stock || 0,
                    canMake: item ? Math.floor((item.stock || 0) / c.quantity) : 0,
                    cost: Number(item?.cost || 0) * c.quantity
                }
            })

            const maxBundles = Math.min(...details.map(d => d.canMake))
            const totalCost = details.reduce((s, d) => s + d.cost, 0)

            return ApiResponse.success({
                bundle: { id: bundle.id, name: bundle.name, price: Number(bundle.price) },
                components: details,
                maxBundlesAvailable: maxBundles,
                totalComponentCost: Math.round(totalCost * 100) / 100,
                margin: Math.round((Number(bundle.price) - totalCost) * 100) / 100
            })
        }

        // List all bundles
        const bundles = await prisma.item.findMany({
            where: { franchiseId: user.franchiseId, isBundle: true, isActive: true },
            select: { id: true, name: true, price: true, barcode: true },
            orderBy: { name: 'asc' }
        })

        return ApiResponse.success({ bundles })
    } catch (error) {
        console.error('[KIT_BUNDLE_GET]', error)
        return ApiResponse.error('Failed to fetch bundles')
    }
}
