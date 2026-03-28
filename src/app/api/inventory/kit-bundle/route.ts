import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Kit/Bundle — Create and view product bundles
 * POST /api/inventory/kit-bundle — Create bundle
 * GET /api/inventory/kit-bundle?id=xxx — View bundle/list
 */
export async function POST(req: NextRequest) {
    const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { name, price, barcode, components, categoryId } = await req.json() as {
            name: string; price: number; barcode?: string
            components: { itemId: string; quantity: number }[]; categoryId?: string
        }
        if (!name || !price || !components?.length) return NextResponse.json({ error: 'name, price, and components required' }, { status: 400 })

        const bundle = await prisma.item.create({
            data: {
                franchiseId: user.franchiseId, name, price, barcode: barcode || null,
                type: 'PRODUCT', isActive: true, isBundle: true,
                bundleComponents: JSON.stringify(components), categoryId: categoryId || null
            }
        })

        return NextResponse.json({ bundle })
    } catch (error: any) {
        console.error('[KIT_BUNDLE_POST]', error)
        return NextResponse.json({ error: 'Failed to create kit/bundle' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const bundleId = searchParams.get('id')

    try {
        if (bundleId) {
            const bundle = await prisma.item.findFirst({ where: { id: bundleId, franchiseId: user.franchiseId, isBundle: true } })
            if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })

            const components = JSON.parse(bundle.bundleComponents || '[]') as { itemId: string; quantity: number }[]
            const componentItems = await prisma.item.findMany({
                where: { id: { in: components.map(c => c.itemId) } },
                select: { id: true, name: true, stock: true, cost: true }
            })

            const itemMap = new Map(componentItems.map(i => [i.id, i]))
            const details = components.map(c => {
                const item = itemMap.get(c.itemId)
                return {
                    itemId: c.itemId, name: item?.name || 'Unknown', requiredQty: c.quantity,
                    inStock: item?.stock || 0, canMake: item ? Math.floor((item.stock || 0) / c.quantity) : 0,
                    cost: Number(item?.cost || 0) * c.quantity
                }
            })

            const maxBundles = Math.min(...details.map(d => d.canMake))
            const totalCost = details.reduce((s, d) => s + d.cost, 0)

            return NextResponse.json({
                bundle: { id: bundle.id, name: bundle.name, price: Number(bundle.price) },
                components: details, maxBundlesAvailable: maxBundles,
                totalComponentCost: Math.round(totalCost * 100) / 100,
                margin: Math.round((Number(bundle.price) - totalCost) * 100) / 100
            })
        }

        const bundles = await prisma.item.findMany({
            where: { franchiseId: user.franchiseId, isBundle: true, isActive: true },
            select: { id: true, name: true, price: true, barcode: true }, orderBy: { name: 'asc' }
        })
        return NextResponse.json({ bundles })
    } catch (error: any) {
        console.error('[KIT_BUNDLE_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 })
    }
}
