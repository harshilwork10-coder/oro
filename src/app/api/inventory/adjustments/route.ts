import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { checkStockAvailable } from '@/lib/inventory/stock-guard'

// S8-10: Configurable adjustment reasons with categories and access levels
const ADJUSTMENT_REASONS = {
    // reason → { category, managerOnly, label }
    DAMAGED:       { category: 'DAMAGE',  managerOnly: false, label: 'Damaged goods' },
    SPOILED:       { category: 'WASTE',   managerOnly: false, label: 'Spoiled / expired' },
    EXPIRED:       { category: 'WASTE',   managerOnly: false, label: 'Past expiration' },
    SHRINK:        { category: 'SHRINK',  managerOnly: true,  label: 'Shrinkage (unknown loss)' },
    THEFT:         { category: 'SHRINK',  managerOnly: true,  label: 'Suspected theft' },
    RECOUNT:       { category: 'COUNT',   managerOnly: false, label: 'Physical recount' },
    VENDOR_RETURN: { category: 'VENDOR',  managerOnly: true,  label: 'Returned to vendor' },
    FOUND:         { category: 'COUNT',   managerOnly: false, label: 'Found inventory' },
    SAMPLE:        { category: 'WASTE',   managerOnly: false, label: 'Sample / demo / tasting' },
    BREAKAGE:      { category: 'DAMAGE',  managerOnly: false, label: 'Broken in store' },
    DONATION:      { category: 'WASTE',   managerOnly: true,  label: 'Donated' },
    OTHER:         { category: 'OTHER',   managerOnly: true,  label: 'Other (requires notes)' },
} as const

type AdjustmentReason = keyof typeof ADJUSTMENT_REASONS
const VALID_REASONS = Object.keys(ADJUSTMENT_REASONS) as AdjustmentReason[]
const MANAGER_ROLES = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER']

/**
 * POST /api/inventory/adjustments — Record an inventory adjustment
 * Body: { productId, locationId?, quantity (positive=add, negative=remove), reason, notes? }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { productId, locationId, quantity, reason, notes } = body

        if (!productId || quantity === undefined || quantity === 0) {
            return NextResponse.json({ error: 'productId and non-zero quantity required' }, { status: 400 })
        }
        if (!reason || !VALID_REASONS.includes(reason as AdjustmentReason)) {
            return NextResponse.json({ error: `reason must be one of: ${VALID_REASONS.join(', ')}` }, { status: 400 })
        }

        // S8-10: Manager-only reason check
        const reasonConfig = ADJUSTMENT_REASONS[reason as AdjustmentReason]
        if (reasonConfig.managerOnly && !MANAGER_ROLES.includes(user.role)) {
            return NextResponse.json({ error: `Reason '${reason}' requires manager or higher role` }, { status: 403 })
        }

        // S8-10: OTHER requires notes
        if (reason === 'OTHER' && !notes?.trim()) {
            return NextResponse.json({ error: 'Notes required when reason is OTHER' }, { status: 400 })
        }

        // Get location
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
        const finalLocationId = locationId || dbUser?.locationId
        if (!finalLocationId) {
            const loc = await prisma.location.findFirst({ where: { franchiseId: user.franchiseId } })
            if (!loc) return NextResponse.json({ error: 'No location found' }, { status: 400 })
        }

        // Get current stock
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { stock: true, name: true }
        })
        if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

        const previousStock = product.stock || 0
        const newStock = previousStock + quantity

        // Stock guard: prevent negative stock on removal (quantity < 0)
        if (quantity < 0) {
            const stockCheck = await checkStockAvailable(productId, Math.abs(quantity), user.franchiseId, finalLocationId || undefined)
            if (!stockCheck.allowed) {
                return NextResponse.json({ error: stockCheck.error, currentStock: stockCheck.currentStock }, { status: 400 })
            }
        }

        // Update product stock
        await prisma.product.update({
            where: { id: productId },
            data: { stock: newStock < 0 ? 0 : newStock }
        })

        // Create adjustment record
        const adjustment = await prisma.stockAdjustment.create({
            data: {
                productId,
                locationId: finalLocationId!,
                quantity,
                reason,
                notes,
                performedBy: user.id,
                previousStock,
                newStock: newStock < 0 ? 0 : newStock
            }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.STOCK_ADJUSTED, entityType: 'StockAdjustment', entityId: adjustment.id,
            details: { productId, productName: product.name, quantity, reason, notes, previousStock, newStock }
        })

        return NextResponse.json({
            success: true,
            adjustment: { id: adjustment.id, productName: product.name, quantity, reason, previousStock, newStock: newStock < 0 ? 0 : newStock }
        })
    } catch (error: any) {
        console.error('[INVENTORY_ADJUSTMENT_POST]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * GET /api/inventory/adjustments?productId=xxx&reason=DAMAGED&from=2026-01-01&to=2026-12-31
 * Query adjustment history with filters
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const reason = searchParams.get('reason')
    const locationId = searchParams.get('locationId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    try {
        const where: any = {}
        if (productId) where.productId = productId
        if (reason) where.reason = reason
        if (locationId) where.locationId = locationId
        if (from || to) {
            where.createdAt = {}
            if (from) where.createdAt.gte = new Date(from)
            if (to) where.createdAt.lte = new Date(to)
        }

        const adjustments = await prisma.stockAdjustment.findMany({
            where,
            include: {
                product: { select: { name: true, sku: true, barcode: true } },
                location: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        // Summary by reason
        const summary = adjustments.reduce((acc: Record<string, { count: number, totalQty: number }>, adj) => {
            if (!acc[adj.reason]) acc[adj.reason] = { count: 0, totalQty: 0 }
            acc[adj.reason].count++
            acc[adj.reason].totalQty += adj.quantity
            return acc
        }, {})

        return NextResponse.json({
            adjustments, summary,
            validReasons: VALID_REASONS,
            // S8-10: Full reason config for frontend
            reasonConfig: Object.entries(ADJUSTMENT_REASONS).map(([key, cfg]) => ({
                reason: key, ...cfg
            }))
        })
    } catch (error: any) {
        console.error('[INVENTORY_ADJUSTMENT_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

