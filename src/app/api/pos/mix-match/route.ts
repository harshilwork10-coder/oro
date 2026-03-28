import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Mix-and-Match Pricing Engine
 *
 * POST /api/pos/mix-match — Create a mix-and-match deal
 * Body: { name, type: 'BUY_X_GET_Y' | 'BUNDLE_PRICE', triggerQty, targetQty?, 
 *         bundlePrice?, discountPercent?, productIds: string[], categoryIds?: string[] }
 *
 * GET /api/pos/mix-match — List active mix-match deals
 * GET /api/pos/mix-match?evaluate=true&items=[{productId,qty}] — Evaluate cart items against deals
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { name, type, triggerQty, targetQty, bundlePrice, discountPercent, productIds, categoryIds, startDate, endDate } = body

        if (!name || !type || !triggerQty) {
            return NextResponse.json({ error: 'name, type, and triggerQty required' }, { status: 400 })
        }

        // Store as a Promotion with type MIX_MATCH
        const promo = await prisma.promotion.create({
            data: {
                name,
                description: `Mix-and-Match: ${name}`,
                type: 'MIX_MATCH',
                discountType: type === 'BUNDLE_PRICE' ? 'FIXED' : 'PERCENTAGE',
                discountValue: type === 'BUNDLE_PRICE' ? bundlePrice : (discountPercent || 100),
                isActive: true,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                franchiseId: user.franchiseId,
                // Store mix-match config in priceTiers JSON field
                priceTiers: JSON.stringify({
                    mixMatchType: type,
                    triggerQty,
                    targetQty: targetQty || 1,
                    bundlePrice,
                    discountPercent,
                    productIds: productIds || [],
                    categoryIds: categoryIds || []
                })
            }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'MIX_MATCH_CREATED', entityType: 'Promotion', entityId: promo.id,
            details: { name, type, triggerQty, productIds }
        })

        return NextResponse.json(promo, { status: 201 })
    } catch (error: any) {
        console.error('[MIX_MATCH_POST]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const evaluate = searchParams.get('evaluate')
    const itemsParam = searchParams.get('items')

    try {
        const deals = await prisma.promotion.findMany({
            where: {
                franchiseId: user.franchiseId,
                type: 'MIX_MATCH',
                isActive: true
            },
            orderBy: { createdAt: 'desc' }
        })

        const parsedDeals = deals.map(d => {
            const conditions = d.priceTiers ? JSON.parse(d.priceTiers as string) : {}
            return { ...d, mixMatch: conditions }
        })

        // Cart evaluation mode — check which deals apply to provided items
        if (evaluate === 'true' && itemsParam) {
            const cartItems: { productId: string; qty: number }[] = JSON.parse(itemsParam)
            const applicableDeals = []

            for (const deal of parsedDeals) {
                const mm = deal.mixMatch
                const matchingItems = cartItems.filter(ci =>
                    mm.productIds?.includes(ci.productId) ||
                    mm.categoryIds?.length > 0 // Category matching would need product lookup
                )

                const totalQty = matchingItems.reduce((s, i) => s + i.qty, 0)
                if (totalQty >= mm.triggerQty) {
                    const timesApplicable = Math.floor(totalQty / mm.triggerQty)
                    applicableDeals.push({
                        dealId: deal.id,
                        dealName: deal.name,
                        type: mm.mixMatchType,
                        timesApplicable,
                        triggerQty: mm.triggerQty,
                        discountPerApplication: mm.mixMatchType === 'BUNDLE_PRICE'
                            ? null // Bundle replaces price
                            : mm.discountPercent,
                        bundlePrice: mm.bundlePrice
                    })
                }
            }

            return NextResponse.json({ deals: parsedDeals, applicableDeals })
        }

        return NextResponse.json({ deals: parsedDeals })
    } catch (error: any) {
        console.error('[MIX_MATCH_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// S8-01: Deactivate a deal
export async function DELETE(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dealId = searchParams.get('id')
    if (!dealId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    try {
        await prisma.promotion.update({
            where: { id: dealId },
            data: { isActive: false }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'MIX_MATCH_DEACTIVATED', entityType: 'Promotion', entityId: dealId,
            details: {}
        })

        return NextResponse.json({ success: true, id: dealId, status: 'DEACTIVATED' })
    } catch (error: any) {
        console.error('[MIX_MATCH_DELETE]', error)
        return NextResponse.json({ error: 'Failed to deactivate' }, { status: 500 })
    }
}
