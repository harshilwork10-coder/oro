import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════════
// INVENTORY CASH HEALTH — Owner Dashboard Aggregate
// ═══════════════════════════════════════════════════════════════════
// Returns: KPI cards + drilldown lists for "Inventory Cash Intelligence"

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(request: Request) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId

        // ───── All active products with cost ─────
        const products = await prisma.product.findMany({
            where: { franchiseId, isActive: true },
            select: {
                id: true, name: true, barcode: true, sku: true,
                stock: true, cost: true, price: true,
                reorderPoint: true, maxStock: true, unitsPerCase: true,
                vendor: true
            }
        })

        // ───── On-Order Cost (ORDERED POs) ─────
        let onOrderCost = 0
        try {
            const onOrderAgg = await prisma.purchaseOrder.aggregate({
                where: { franchiseId, status: 'ORDERED' },
                _sum: { totalCost: true }
            })
            onOrderCost = onOrderAgg._sum?.totalCost ? Number(onOrderAgg._sum.totalCost) : 0
        } catch { /* OK */ }

        // ───── Per-product intelligence ─────
        const now = Date.now()
        const thirtyDaysAgo = new Date(now - 30 * DAY_MS)

        // Batch: get last sale date and 30d units for ALL products at once
        // We'll use raw queries for efficiency on large catalogs
        let productSales30d: Record<string, number> = {}
        let productLastSale: Record<string, Date | null> = {}

        try {
            // Get 30-day sales grouped by product
            const sales30dRaw = await prisma.transactionLineItem.groupBy({
                by: ['productId'],
                where: {
                    productId: { in: products.map(p => p.id) },
                    createdAt: { gte: thirtyDaysAgo },
                    transaction: { status: 'COMPLETED' }
                },
                _sum: { quantity: true }
            })
            for (const row of sales30dRaw) {
                if (row.productId) productSales30d[row.productId] = row._sum?.quantity || 0
            }
        } catch { /* OK */ }

        try {
            // Get last sale per product
            const lastSales = await prisma.transactionLineItem.findMany({
                where: {
                    productId: { in: products.map(p => p.id) },
                    transaction: { status: 'COMPLETED' }
                },
                orderBy: { createdAt: 'desc' },
                distinct: ['productId'],
                select: { productId: true, createdAt: true }
            })
            for (const row of lastSales) {
                if (row.productId) productLastSale[row.productId] = row.createdAt
            }
        } catch { /* OK */ }

        // ───── Compute aggregate KPIs ─────
        let totalCostOnHand = 0
        let totalAtRiskCost = 0
        let totalDeadStockCost = 0
        let lowStockCount = 0
        let noSale30dCount = 0

        type ProductIntel = {
            id: string
            name: string
            barcode: string | null
            vendor: string | null
            stock: number
            cost: number
            costOnHand: number
            daysSinceLastSale: number
            daysOfSupply: number
            reorderStatus: string
            suggestedAction: string
            deadStockRisk: number
            moneyAtRisk: number
        }

        const allIntel: ProductIntel[] = []

        for (const p of products) {
            const cost = p.cost ? Number(p.cost) : 0
            const stock = p.stock || 0
            const costOnHand = stock * cost

            totalCostOnHand += costOnHand

            // Velocity from 30d sales (simplified for dashboard speed)
            const sold30d = productSales30d[p.id] || 0
            const dailyVelocity = sold30d / 30
            const daysOfSupply = dailyVelocity > 0 ? Math.round(stock / dailyVelocity) : 999

            const targetStock = p.maxStock || Math.ceil(dailyVelocity * 14) // 14d default
            const excessStock = Math.max(0, stock - targetStock)
            const moneyAtRisk = excessStock * cost

            if (moneyAtRisk > 0) totalAtRiskCost += moneyAtRisk

            // Last sale
            const lastSaleDate = productLastSale[p.id]
            const daysSinceLastSale = lastSaleDate
                ? Math.ceil((now - new Date(lastSaleDate).getTime()) / DAY_MS)
                : 999

            // No-sale 30d
            if (sold30d === 0 && stock > 0) {
                noSale30dCount++
                totalDeadStockCost += costOnHand
            }

            // Low stock
            if (p.reorderPoint && stock <= p.reorderPoint && stock > 0) {
                lowStockCount++
            }

            // Dead stock risk (simplified)
            let riskScore = 0
            if (daysSinceLastSale >= 90) riskScore += 40
            else if (daysSinceLastSale >= 60) riskScore += 30
            else if (daysSinceLastSale >= 30) riskScore += 20
            else if (daysSinceLastSale >= 14) riskScore += 10
            if (daysOfSupply >= 120) riskScore += 30
            else if (daysOfSupply >= 60) riskScore += 20
            else if (daysOfSupply >= 30) riskScore += 10

            // Reorder status
            let reorderStatus = 'WATCH'
            if (riskScore >= 70) reorderStatus = 'EXIT'
            else if (riskScore >= 50) reorderStatus = 'FREEZE'
            else if (stock <= (p.reorderPoint || 0) || daysOfSupply < 14) reorderStatus = 'REFILL'

            // Suggested action
            let suggestedAction = 'Hold'
            if (reorderStatus === 'EXIT') suggestedAction = moneyAtRisk > 50 ? `Markdown now` : 'Stop buying'
            else if (reorderStatus === 'FREEZE') suggestedAction = 'Do not reorder'
            else if (reorderStatus === 'REFILL') {
                const qty = Math.max(0, Math.ceil(dailyVelocity * 14 - stock))
                if (p.unitsPerCase && p.unitsPerCase > 1 && qty > 0) {
                    const cases = Math.ceil(qty / p.unitsPerCase)
                    suggestedAction = `Reorder ${cases} case${cases > 1 ? 's' : ''}`
                } else if (qty > 0) {
                    suggestedAction = `Reorder ${qty} units`
                }
            }

            allIntel.push({
                id: p.id, name: p.name, barcode: p.barcode, vendor: p.vendor,
                stock, cost, costOnHand, daysSinceLastSale, daysOfSupply,
                reorderStatus, suggestedAction, deadStockRisk: riskScore, moneyAtRisk
            })
        }

        // ───── Drilldown Lists ─────

        // Cash Traps: highest costOnHand where daysOfSupply > 60
        const cashTraps = allIntel
            .filter(p => p.daysOfSupply > 60 && p.costOnHand > 0)
            .sort((a, b) => b.costOnHand - a.costOnHand)
            .slice(0, 10)

        // Reorder Now: status = REFILL, sorted by daysOfSupply ascending
        const reorderNow = allIntel
            .filter(p => p.reorderStatus === 'REFILL')
            .sort((a, b) => a.daysOfSupply - b.daysOfSupply)
            .slice(0, 10)

        // Freeze Reorder: status = FREEZE or EXIT, sorted by deadStockRisk descending
        const freezeReorder = allIntel
            .filter(p => p.reorderStatus === 'FREEZE' || p.reorderStatus === 'EXIT')
            .sort((a, b) => b.deadStockRisk - a.deadStockRisk)
            .slice(0, 10)

        return NextResponse.json({
            kpi: {
                costOnHand: Math.round(totalCostOnHand * 100) / 100,
                atRiskCost: Math.round(totalAtRiskCost * 100) / 100,
                deadStockCost: Math.round(totalDeadStockCost * 100) / 100,
                onOrderCost: Math.round(onOrderCost * 100) / 100,
                lowStockCount,
                noSale30dCount,
                totalSKUs: products.length
            },
            cashTraps,
            reorderNow,
            freezeReorder
        })

    } catch (error) {
        console.error('Error computing cash health:', error)
        return NextResponse.json({
            kpi: {
                costOnHand: 0, atRiskCost: 0, deadStockCost: 0,
                onOrderCost: 0, lowStockCount: 0, noSale30dCount: 0, totalSKUs: 0
            },
            cashTraps: [], reorderNow: [], freezeReorder: []
        }, { status: 200 })
    }
}
