import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * Mix-and-Match Pricing API
 * 
 * "Any 3 sodas for $5" — customer picks any items from a set 
 * and gets a group price when they hit the quantity threshold.
 * 
 * Uses the Promotion model with type MIX_MATCH
 * 
 * GET — list active mix-and-match deals
 * POST — create a new mix-and-match deal
 * PUT — check a cart against active deals and return discounts
 */

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        // Get active promotions that are mix-and-match type
        const deals = await prisma.promotion.findMany({
            where: {
                franchiseId,
                isActive: true,
                type: { in: ['MIX_MATCH', 'QUANTITY_DISCOUNT'] },
            },
            select: {
                id: true,
                name: true,
                type: true,
                conditions: true,
                discountValue: true,
                startDate: true,
                endDate: true,
                isActive: true,
            },
        })

        const formatted = deals.map(d => {
            const conditions = typeof d.conditions === 'string' ? JSON.parse(d.conditions as string) : (d.conditions || {}) as any
            return {
                id: d.id,
                name: d.name,
                type: d.type,
                quantityRequired: conditions.quantityRequired || 0,
                groupPrice: conditions.groupPrice || Number(d.discountValue || 0),
                categories: conditions.categories || [],
                productIds: conditions.productIds || [],
                startDate: d.startDate,
                endDate: d.endDate,
                isActive: d.isActive,
            }
        })

        return NextResponse.json({ deals: formatted })

    } catch (error) {
        console.error('Mix-Match GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const body = await req.json()
        const {
            name,               // "Any 3 Sodas for $5"
            quantityRequired,   // 3
            groupPrice,         // 5.00
            categories,         // ["Soda", "Drinks"]
            productIds,         // optional: specific product IDs
            startDate,
            endDate,
        } = body

        if (!name || !quantityRequired || !groupPrice) {
            return NextResponse.json({ error: 'name, quantityRequired, groupPrice required' }, { status: 400 })
        }

        const deal = await prisma.promotion.create({
            data: {
                franchiseId,
                name,
                type: 'MIX_MATCH',
                discountType: 'FIXED_PRICE',
                discountValue: groupPrice,
                conditions: JSON.stringify({
                    quantityRequired,
                    groupPrice,
                    categories: categories || [],
                    productIds: productIds || [],
                }),
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                isActive: true,
            },
        })

        return NextResponse.json({ success: true, deal })

    } catch (error) {
        console.error('Mix-Match POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

/**
 * PUT — Check cart items against active mix-and-match deals
 * Returns applicable discounts
 */
export async function PUT(req: NextRequest) {
    try {
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { cartItems } = await req.json()
        // cartItems: [{ productId, name, category, price, quantity }]

        if (!cartItems?.length) {
            return NextResponse.json({ discounts: [], totalSavings: 0 })
        }

        // Get active mix-match deals
        const now = new Date()
        const deals = await prisma.promotion.findMany({
            where: {
                franchiseId,
                isActive: true,
                type: { in: ['MIX_MATCH', 'QUANTITY_DISCOUNT'] },
                startDate: { lte: now },
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } },
                ],
            },
            select: {
                id: true,
                name: true,
                conditions: true,
                discountValue: true,
            },
        })

        const discounts: { dealId: string; dealName: string; savings: number; detail: string; appliedToItems: string[] }[] = []

        for (const deal of deals) {
            const cond = typeof deal.conditions === 'string' ? JSON.parse(deal.conditions as string) : (deal.conditions || {}) as any
            const qtyRequired = cond.quantityRequired || 0
            const groupPrice = cond.groupPrice || Number(deal.discountValue || 0)
            const dealCategories: string[] = (cond.categories || []).map((c: string) => c.toLowerCase())
            const dealProductIds: string[] = cond.productIds || []

            // Find qualifying items in the cart
            const qualifying = cartItems.filter((item: any) => {
                if (dealProductIds.length > 0 && dealProductIds.includes(item.productId)) return true
                if (dealCategories.length > 0 && dealCategories.includes((item.category || '').toLowerCase())) return true
                return false
            })

            // Sum total qualifying quantity
            const totalQty = qualifying.reduce((s: number, i: any) => s + (i.quantity || 1), 0)

            if (totalQty >= qtyRequired && qtyRequired > 0) {
                // How many complete groups?
                const groups = Math.floor(totalQty / qtyRequired)

                // Sort by price descending to apply deal to most expensive items first (customer benefit)
                const sorted = [...qualifying].sort((a: any, b: any) => b.price - a.price)

                // Calculate individual total for items in the group
                let individualTotal = 0
                let itemsUsed = 0
                const appliedItems: string[] = []

                for (const item of sorted) {
                    const useQty = Math.min(item.quantity || 1, groups * qtyRequired - itemsUsed)
                    if (useQty <= 0) break
                    individualTotal += (item.price || 0) * useQty
                    itemsUsed += useQty
                    appliedItems.push(item.name)
                    if (itemsUsed >= groups * qtyRequired) break
                }

                const dealTotal = groups * groupPrice
                const savings = Math.round((individualTotal - dealTotal) * 100) / 100

                if (savings > 0) {
                    discounts.push({
                        dealId: deal.id,
                        dealName: deal.name,
                        savings,
                        detail: `${groups}x ${deal.name}: $${dealTotal.toFixed(2)} (save $${savings.toFixed(2)})`,
                        appliedToItems: appliedItems,
                    })
                }
            }
        }

        const totalSavings = discounts.reduce((s, d) => s + d.savings, 0)

        return NextResponse.json({
            discounts,
            totalSavings: Math.round(totalSavings * 100) / 100,
            dealsChecked: deals.length,
        })

    } catch (error) {
        console.error('Mix-Match PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
