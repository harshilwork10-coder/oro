import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Matrix Items — Create and view parent/variant product structures
 * POST /api/inventory/matrix-items — Create matrix with variants
 * GET /api/inventory/matrix-items?parentId=xxx — View variants/list parents
 */
export async function POST(req: NextRequest) {
    const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { parentName, categoryId, variants } = await req.json() as {
            parentName: string; categoryId?: string
            variants: { name: string; sku: string; barcode?: string; price: number; cost?: number; stock?: number; attributes: Record<string, string> }[]
        }
        if (!parentName || !variants?.length) return NextResponse.json({ error: 'parentName and variants required' }, { status: 400 })

        const parent = await prisma.item.create({
            data: {
                franchiseId: user.franchiseId, name: parentName, type: 'PRODUCT',
                isActive: true, isMatrix: true, price: variants[0].price, categoryId: categoryId || null
            }
        })

        const createdVariants = []
        for (const v of variants) {
            const variant = await prisma.item.create({
                data: {
                    franchiseId: user.franchiseId, name: `${parentName} - ${v.name}`,
                    sku: v.sku, barcode: v.barcode || null, price: v.price, cost: v.cost || 0,
                    stock: v.stock || 0, type: 'PRODUCT', isActive: true,
                    parentItemId: parent.id, variantAttributes: JSON.stringify(v.attributes), categoryId: categoryId || null
                }
            })
            createdVariants.push(variant)
        }

        return NextResponse.json({
            parent: { id: parent.id, name: parent.name },
            variants: createdVariants.map(v => ({ id: v.id, name: v.name, sku: v.sku, price: Number(v.price) })),
            totalVariants: createdVariants.length
        })
    } catch (error: any) {
        console.error('[MATRIX_POST]', error)
        return NextResponse.json({ error: 'Failed to create matrix item' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const parentId = searchParams.get('parentId')

    try {
        if (parentId) {
            const parent = await prisma.item.findFirst({ where: { id: parentId, franchiseId: user.franchiseId, isMatrix: true } })
            if (!parent) return NextResponse.json({ error: 'Matrix item not found' }, { status: 404 })

            const variants = await prisma.item.findMany({ where: { parentItemId: parentId, isActive: true }, orderBy: { name: 'asc' } })

            return NextResponse.json({
                parent: { id: parent.id, name: parent.name },
                variants: variants.map(v => ({
                    id: v.id, name: v.name, sku: v.sku, barcode: v.barcode,
                    price: Number(v.price), cost: Number(v.cost || 0), stock: v.stock || 0,
                    attributes: v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
                }))
            })
        }

        const matrices = await prisma.item.findMany({
            where: { franchiseId: user.franchiseId, isMatrix: true, isActive: true },
            select: { id: true, name: true }, orderBy: { name: 'asc' }
        })
        return NextResponse.json({ matrices })
    } catch (error: any) {
        console.error('[MATRIX_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch matrix items' }, { status: 500 })
    }
}
