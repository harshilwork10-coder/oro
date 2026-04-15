import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════════
// PRODUCT INSIGHTS + CASH INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════
// Returns: history, velocity, cash position, reorder status, action

const DAY_MS = 24 * 60 * 60 * 1000

// Weighted velocity: 50% recent (7d), 30% medium (30d), 20% long (90d)
function computeWeightedVelocity(v7: number, v30: number, v90: number): number {
    // If all zero, product is dead
    if (v7 === 0 && v30 === 0 && v90 === 0) return 0
    return (v7 * 0.5) + (v30 * 0.3) + (v90 * 0.2)
}

// Dead Stock Risk Score: 0-100
function computeDeadStockRisk(daysSinceLastSale: number, daysOfSupply: number, sellThrough: number): number {
    // Days since last sale: 0-40 points
    let salePts = 0
    if (daysSinceLastSale >= 90) salePts = 40
    else if (daysSinceLastSale >= 60) salePts = 30
    else if (daysSinceLastSale >= 30) salePts = 20
    else if (daysSinceLastSale >= 14) salePts = 10
    else if (daysSinceLastSale >= 7) salePts = 5

    // Days of supply: 0-30 points
    let supplyPts = 0
    if (daysOfSupply >= 120) supplyPts = 30
    else if (daysOfSupply >= 90) supplyPts = 25
    else if (daysOfSupply >= 60) supplyPts = 20
    else if (daysOfSupply >= 30) supplyPts = 10
    else if (daysOfSupply >= 14) supplyPts = 5

    // Sell-through: 0-30 points (low sell-through = bad)
    let sellPts = 0
    if (sellThrough < 10) sellPts = 30
    else if (sellThrough < 25) sellPts = 20
    else if (sellThrough < 50) sellPts = 15
    else if (sellThrough < 80) sellPts = 5

    return Math.min(100, salePts + supplyPts + sellPts)
}

// Reorder status: REFILL / WATCH / FREEZE / EXIT
function computeReorderStatus(
    deadStockRisk: number,
    daysOfSupply: number,
    coverageDays: number,
    stock: number,
    reorderPoint: number | null
): 'REFILL' | 'WATCH' | 'FREEZE' | 'EXIT' {
    if (deadStockRisk >= 70) return 'EXIT'
    if (deadStockRisk >= 50) return 'FREEZE'
    if (stock <= (reorderPoint || 0) || daysOfSupply < coverageDays) return 'REFILL'
    return 'WATCH'
}

// Suggested action: plain English for owners
function computeSuggestedAction(
    status: string,
    suggestedQty: number,
    unitsPerCase: number | null,
    daysOfSupply: number,
    coverageDays: number,
    moneyAtRisk: number
): string {
    if (status === 'EXIT') {
        return moneyAtRisk > 50
            ? `Dead — Markdown now ($${moneyAtRisk.toFixed(0)} at risk)`
            : 'Stop buying — sell through remaining'
    }
    if (status === 'FREEZE') return 'Do not reorder — sell through first'
    if (status === 'REFILL') {
        if (suggestedQty <= 0) return 'Monitor — stock may be OK'
        if (unitsPerCase && unitsPerCase > 1) {
            const cases = Math.ceil(suggestedQty / unitsPerCase)
            const totalUnits = cases * unitsPerCase
            return `Reorder ${cases} case${cases > 1 ? 's' : ''} (${totalUnits} units)`
        }
        return `Reorder ${suggestedQty} units`
    }
    // WATCH
    const holdDays = Math.max(0, Math.round(daysOfSupply - coverageDays))
    return holdDays > 0 ? `Hold ${holdDays} more days` : 'On track — hold'
}

export async function GET(request: Request) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

        const targetDays = Math.min(90, Math.max(7, parseInt(searchParams.get('targetDays') || '14', 10)))

        // ───── Product ─────
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true, name: true, barcode: true, sku: true,
                price: true, cost: true, stock: true, vendor: true,
                reorderPoint: true, maxStock: true, unitsPerCase: true,
                franchiseId: true
            }
        })
        if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

        const cost = product.cost ? Number(product.cost) : 0
        const stock = product.stock || 0

        // ───── Last Order ─────
        let lastOrder: any = null
        try {
            lastOrder = await prisma.purchaseOrderItem.findFirst({
                where: { productId },
                orderBy: { purchaseOrder: { createdAt: 'desc' } },
                include: {
                    purchaseOrder: {
                        select: { id: true, createdAt: true, status: true, supplier: { select: { name: true } } }
                    }
                }
            })
        } catch { /* OK */ }

        const sinceDate = lastOrder?.purchaseOrder?.createdAt
            ? new Date(lastOrder.purchaseOrder.createdAt)
            : new Date(Date.now() - 90 * DAY_MS)

        const daysSinceOrder = Math.max(1, Math.ceil((Date.now() - sinceDate.getTime()) / DAY_MS))

        // ───── Sales Aggregates (7d / 30d / 90d / since-order / all-time) ─────
        const now = Date.now()
        const baseWhere = { productId, transaction: { status: 'COMPLETED' as const } }

        const [sales7, sales30, sales90, salesSinceOrder, allTimeSales, lastSale] = await Promise.all([
            prisma.transactionLineItem.aggregate({
                where: { ...baseWhere, createdAt: { gte: new Date(now - 7 * DAY_MS) } },
                _sum: { quantity: true, total: true }, _count: true
            }).catch(() => ({ _sum: { quantity: 0, total: null }, _count: 0 })),

            prisma.transactionLineItem.aggregate({
                where: { ...baseWhere, createdAt: { gte: new Date(now - 30 * DAY_MS) } },
                _sum: { quantity: true, total: true }, _count: true
            }).catch(() => ({ _sum: { quantity: 0, total: null }, _count: 0 })),

            prisma.transactionLineItem.aggregate({
                where: { ...baseWhere, createdAt: { gte: new Date(now - 90 * DAY_MS) } },
                _sum: { quantity: true, total: true }, _count: true
            }).catch(() => ({ _sum: { quantity: 0, total: null }, _count: 0 })),

            prisma.transactionLineItem.aggregate({
                where: { ...baseWhere, createdAt: { gte: sinceDate } },
                _sum: { quantity: true, total: true }, _count: true
            }).catch(() => ({ _sum: { quantity: 0, total: null }, _count: 0 })),

            prisma.transactionLineItem.aggregate({
                where: baseWhere,
                _sum: { quantity: true, total: true }
            }).catch(() => ({ _sum: { quantity: 0, total: null } })),

            prisma.transactionLineItem.findFirst({
                where: baseWhere,
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            }).catch(() => null)
        ])

        // ───── Velocity Calculation ─────
        const units7 = sales7._sum?.quantity || 0
        const units30 = sales30._sum?.quantity || 0
        const units90 = sales90._sum?.quantity || 0
        const unitsSinceOrder = salesSinceOrder._sum?.quantity || 0

        const v7 = units7 / 7
        const v30 = units30 / 30
        const v90 = units90 / 90
        const weightedVelocity = computeWeightedVelocity(v7, v30, v90)
        const daysOfSupply = weightedVelocity > 0 ? Math.round(stock / weightedVelocity) : 999

        // ───── Cash Intelligence ─────
        const costOnHand = stock * cost
        const targetStock = product.maxStock || Math.ceil(weightedVelocity * targetDays)
        const moneyAtRisk = Math.max(0, (stock - targetStock) * cost)
        const lastOrderQty = lastOrder?.quantity || 0
        const sellThrough = lastOrderQty > 0
            ? Math.min(100, Math.round((unitsSinceOrder / lastOrderQty) * 100))
            : 0
        const lastOrderRegretUnits = lastOrderQty > 0 ? Math.max(0, lastOrderQty - unitsSinceOrder) : 0
        const lastOrderRegretCost = lastOrderRegretUnits * (lastOrder ? Number(lastOrder.unitCost || 0) : cost)

        const daysSinceLastSale = lastSale?.createdAt
            ? Math.ceil((Date.now() - new Date(lastSale.createdAt).getTime()) / DAY_MS)
            : 999

        const deadStockRisk = computeDeadStockRisk(daysSinceLastSale, daysOfSupply, sellThrough)
        const reorderStatus = computeReorderStatus(deadStockRisk, daysOfSupply, targetDays, stock, product.reorderPoint)

        const suggestedOrderQty = reorderStatus === 'REFILL'
            ? Math.max(0, Math.ceil(weightedVelocity * targetDays - stock))
            : 0

        const suggestedAction = computeSuggestedAction(
            reorderStatus, suggestedOrderQty, product.unitsPerCase,
            daysOfSupply, targetDays, moneyAtRisk
        )

        // ───── Transfer Before Buy (multi-location only) ─────
        let transferSuggestion: any = null
        try {
            // Check if user's franchise is multi-location owner
            const franchise = await prisma.franchise.findUnique({
                where: { id: product.franchiseId },
                select: { franchisorId: true }
            })
            let isMultiLoc = false
            if (franchise?.franchisorId) {
                const franchisor = await prisma.franchisor.findUnique({
                    where: { id: franchise.franchisorId },
                    select: { businessType: true }
                })
                isMultiLoc = franchisor?.businessType === 'MULTI_LOCATION_OWNER'
            }
            if (isMultiLoc && product.barcode && reorderStatus === 'REFILL') {
                // Find sibling locations with excess stock of the same barcode
                const siblingProducts = await prisma.product.findMany({
                    where: {
                        barcode: product.barcode,
                        franchiseId: { not: product.franchiseId },
                        stock: { gt: 0 }
                    },
                    select: {
                        id: true, stock: true, maxStock: true, reorderPoint: true,
                        franchise: { select: { name: true } }
                    },
                    take: 5
                })
                for (const sib of siblingProducts) {
                    const sibTarget = sib.maxStock || targetStock
                    const sibExcess = sib.stock - sibTarget
                    if (sibExcess > 0) {
                        const transferQty = Math.min(sibExcess, suggestedOrderQty || sibExcess)
                        let transferLabel = `${transferQty} units`
                        if (product.unitsPerCase && product.unitsPerCase > 1 && transferQty >= product.unitsPerCase) {
                            const cases = Math.floor(transferQty / product.unitsPerCase)
                            const totalUnits = cases * product.unitsPerCase
                            transferLabel = `${cases} case${cases > 1 ? 's' : ''} (${totalUnits} units)`
                        }
                        transferSuggestion = {
                            fromLocation: sib.franchise?.name || 'Another store',
                            qty: transferQty,
                            label: `Transfer ${transferLabel} from ${sib.franchise?.name || 'another store'}`,
                            savesOrderCost: transferQty * cost
                        }
                        break
                    }
                }
            }
        } catch { /* OK — transfer is optional */ }

        // ───── Response ─────
        return NextResponse.json({
            // === EXISTING FIELDS (unchanged) ===
            product: {
                id: product.id, name: product.name, barcode: product.barcode,
                sku: product.sku, price: Number(product.price),
                cost, stock, vendor: product.vendor,
                reorderPoint: product.reorderPoint, unitsPerCase: product.unitsPerCase
            },
            lastOrder: lastOrder ? {
                date: lastOrder.purchaseOrder?.createdAt,
                quantity: lastOrder.quantity,
                unitCost: Number(lastOrder.unitCost),
                supplier: lastOrder.purchaseOrder?.supplier?.name || 'Unknown',
                daysAgo: daysSinceOrder
            } : null,
            salesSinceOrder: {
                units: unitsSinceOrder,
                revenue: salesSinceOrder._sum?.total ? Number(salesSinceOrder._sum.total) : 0,
                transactions: salesSinceOrder._count || 0
            },
            velocity: {
                unitsPerDay: Math.round(weightedVelocity * 100) / 100,
                daysOfStock: daysOfSupply,
                isLow: product.reorderPoint ? stock <= product.reorderPoint : false
            },
            allTimeSales: {
                units: allTimeSales._sum?.quantity || 0,
                revenue: allTimeSales._sum?.total ? Number(allTimeSales._sum.total) : 0
            },
            lastSaleDate: lastSale?.createdAt || null,
            weeklySold: {
                units: units7,
                revenue: sales7._sum?.total ? Number(sales7._sum.total) : 0,
                transactions: sales7._count || 0
            },
            monthlySold: {
                units: units30,
                revenue: sales30._sum?.total ? Number(sales30._sum.total) : 0,
                transactions: sales30._count || 0
            },
            suggestion: {
                orderQty: suggestedOrderQty,
                coversDays: targetDays,
                estimatedCost: cost ? suggestedOrderQty * cost : null
            },

            // === NEW: CASH INTELLIGENCE ===
            cashIntel: {
                costOnHand,
                moneyAtRisk,
                targetStock,
                sellThrough,
                daysOfSupply,
                daysSinceLastSale,
                deadStockRisk,
                reorderStatus,
                suggestedAction,
                lastOrderRegret: {
                    units: lastOrderRegretUnits,
                    cost: lastOrderRegretCost
                },
                weightedVelocity: Math.round(weightedVelocity * 100) / 100,
                transferSuggestion
            }
        })

    } catch (error) {
        console.error('Error getting product insights:', error)
        return NextResponse.json({
            error: 'Failed to get insights',
            product: null, lastOrder: null,
            salesSinceOrder: { units: 0, revenue: 0, transactions: 0 },
            velocity: { unitsPerDay: 0, daysOfStock: 999, isLow: false },
            allTimeSales: { units: 0, revenue: 0 },
            lastSaleDate: null,
            weeklySold: { units: 0, revenue: 0, transactions: 0 },
            monthlySold: { units: 0, revenue: 0, transactions: 0 },
            suggestion: { orderQty: 0, coversDays: 14, estimatedCost: null },
            cashIntel: {
                costOnHand: 0, moneyAtRisk: 0, targetStock: 0, sellThrough: 0,
                daysOfSupply: 999, daysSinceLastSale: 999, deadStockRisk: 0,
                reorderStatus: 'WATCH', suggestedAction: 'No data',
                lastOrderRegret: { units: 0, cost: 0 },
                weightedVelocity: 0, transferSuggestion: null
            }
        }, { status: 200 })
    }
}
