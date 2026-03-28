import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * S8-08: Duplicate UPC Detection + Merge Workflow
 *
 * GET /api/inventory/duplicate-upc — Scan catalog for duplicate barcodes
 * POST /api/inventory/duplicate-upc — Merge two items (keep target, archive source)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // Find all items with barcodes, grouped by barcode
        const items = await prisma.item.findMany({
            where: { franchiseId: user.franchiseId, barcode: { not: null } },
            select: { id: true, name: true, barcode: true, sku: true, price: true, stock: true, isActive: true, updatedAt: true },
            orderBy: { barcode: 'asc' }
        })

        // Group by barcode and find duplicates
        const barcodeMap = new Map<string, typeof items>()
        for (const item of items) {
            if (!item.barcode) continue
            const key = item.barcode.trim()
            if (!barcodeMap.has(key)) barcodeMap.set(key, [])
            barcodeMap.get(key)!.push(item)
        }

        const duplicates = Array.from(barcodeMap.entries())
            .filter(([_, group]) => group.length > 1)
            .map(([barcode, group]) => ({
                barcode,
                count: group.length,
                items: group.map(i => ({
                    id: i.id, name: i.name, sku: i.sku,
                    price: i.price, stock: i.stock,
                    isActive: i.isActive,
                    lastUpdated: i.updatedAt
                }))
            }))

        // Also check products table
        const products = await prisma.product.findMany({
            where: { franchiseId: user.franchiseId, barcode: { not: null } },
            select: { id: true, name: true, barcode: true, sku: true, price: true, stock: true, isActive: true, updatedAt: true },
            orderBy: { barcode: 'asc' }
        })

        const productBarcodeMap = new Map<string, typeof products>()
        for (const p of products) {
            if (!p.barcode) continue
            const key = p.barcode.trim()
            if (!productBarcodeMap.has(key)) productBarcodeMap.set(key, [])
            productBarcodeMap.get(key)!.push(p)
        }

        const productDuplicates = Array.from(productBarcodeMap.entries())
            .filter(([_, group]) => group.length > 1)
            .map(([barcode, group]) => ({
                barcode,
                count: group.length,
                items: group.map(p => ({
                    id: p.id, name: p.name, sku: p.sku,
                    price: p.price, stock: p.stock,
                    isActive: p.isActive,
                    lastUpdated: p.updatedAt
                }))
            }))

        return NextResponse.json({
            itemDuplicates: duplicates,
            productDuplicates,
            totalDuplicateGroups: duplicates.length + productDuplicates.length,
            totalAffectedItems: duplicates.reduce((s, d) => s + d.count, 0) + productDuplicates.reduce((s, d) => s + d.count, 0)
        })
    } catch (error: any) {
        console.error('[DUPLICATE_UPC_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Owner+ only for merge operations
    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ access required' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { sourceId, targetId, model } = body as {
            sourceId: string   // item to archive/remove
            targetId: string   // item to keep
            model: 'item' | 'product'
        }

        if (!sourceId || !targetId) {
            return NextResponse.json({ error: 'sourceId and targetId required' }, { status: 400 })
        }
        if (sourceId === targetId) {
            return NextResponse.json({ error: 'Cannot merge item with itself' }, { status: 400 })
        }

        const prismaModel = model === 'product' ? prisma.product : prisma.item

        const source = await (prismaModel as any).findUnique({ where: { id: sourceId } })
        const target = await (prismaModel as any).findUnique({ where: { id: targetId } })

        if (!source || !target) {
            return NextResponse.json({ error: 'Source or target not found' }, { status: 404 })
        }

        // Merge: combine stock, deactivate source
        const combinedStock = (source.stock || 0) + (target.stock || 0)

        await (prismaModel as any).update({
            where: { id: targetId },
            data: { stock: combinedStock }
        })

        await (prismaModel as any).update({
            where: { id: sourceId },
            data: {
                isActive: false,
                barcode: `MERGED-${source.barcode || sourceId}`,
                name: `[MERGED → ${target.name}] ${source.name}`
            }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'DUPLICATE_UPC_MERGED', entityType: model === 'product' ? 'Product' : 'Item', entityId: targetId,
            details: {
                sourceId, targetId,
                sourceName: source.name, targetName: target.name,
                sourceBarcode: source.barcode,
                combinedStock, previousSourceStock: source.stock, previousTargetStock: target.stock
            }
        })

        return NextResponse.json({
            success: true,
            kept: { id: targetId, name: target.name, newStock: combinedStock },
            archived: { id: sourceId, name: source.name }
        })
    } catch (error: any) {
        console.error('[DUPLICATE_UPC_POST]', error)
        return NextResponse.json({ error: error.message || 'Merge failed' }, { status: 500 })
    }
}
