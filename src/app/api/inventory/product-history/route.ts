import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Unified product history timeline
export async function GET(request: Request) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        if (!productId) {
            return NextResponse.json({ error: 'productId is required' }, { status: 400 })
        }

        // Verify product belongs to franchise
        const product = await prisma.product.findFirst({
            where: { id: productId, franchiseId: user.franchiseId },
            select: { id: true, name: true }
        })
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const limit = parseInt(searchParams.get('limit') || '50')

        // Fetch all event sources in parallel (gracefully handle missing models)
        const safeQuery = async (fn: () => Promise<any[]>) => {
            try { return await fn() } catch { return [] }
        }

        const [adjustments, priceLogs, costHistory, invoiceItems] = await Promise.all([
            safeQuery(() => (prisma as any).stockAdjustment.findMany({
                where: { productId },
                orderBy: { createdAt: 'desc' },
                take: limit
            })),
            safeQuery(() => (prisma as any).priceChangeLog.findMany({
                where: { productId },
                orderBy: { createdAt: 'desc' },
                take: limit
            })),
            safeQuery(() => (prisma as any).productCostHistory.findMany({
                where: { productId },
                orderBy: { createdAt: 'desc' },
                take: limit
            })),
            safeQuery(() => (prisma as any).vendorInvoiceItem.findMany({
                where: { matchedProductId: productId },
                include: {
                    vendorInvoice: {
                        select: { invoiceNumber: true, vendorName: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            }))
        ])

        // Merge into unified timeline
        const events = [
            ...adjustments.map((a: any) => ({
                type: 'ADJUSTMENT',
                date: a.createdAt,
                quantity: a.quantity,
                previousStock: a.previousStock,
                newStock: a.newStock,
                reason: a.reason,
                notes: a.notes,
                performedBy: a.performedBy
            })),
            ...priceLogs.map((p: any) => ({
                type: 'PRICE_CHANGE',
                date: p.createdAt,
                oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
                newPrice: p.newPrice ? Number(p.newPrice) : null,
                oldCost: p.oldCost ? Number(p.oldCost) : null,
                newCost: p.newCost ? Number(p.newCost) : null,
                reason: p.reason,
                source: p.source,
                changedBy: p.changedByName || p.changedBy
            })),
            ...costHistory.map((c: any) => ({
                type: 'COST_CHANGE',
                date: c.createdAt,
                oldCost: c.oldCost ? Number(c.oldCost) : null,
                newCost: c.newCost ? Number(c.newCost) : null,
                changePct: c.changePct ? Number(c.changePct) : null,
                sourceType: c.sourceType,
                changedBy: c.changedBy
            })),
            ...invoiceItems.map((v: any) => ({
                type: 'INVOICE_RECEIVED',
                date: v.createdAt,
                quantity: v.quantity,
                unitCost: v.unitCost ? Number(v.unitCost) : null,
                invoiceNumber: v.vendorInvoice?.invoiceNumber,
                vendorName: v.vendorInvoice?.vendorName,
                previousCost: v.previousCost ? Number(v.previousCost) : null,
                costChanged: v.costChanged
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit)

        return NextResponse.json({ events, productName: product.name })
    } catch (error) {
        console.error('[PRODUCT_HISTORY]', error)
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }
}
