import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CartItem {
    id: string
    categoryId?: string
    name: string
    price: number
    quantity: number
}

interface AppliedPromotion {
    promotionId: string
    promotionName: string
    type: string
    discountAmount: number
    affectedItems: string[] // Item IDs
}

// POST - Check cart items for applicable promotions
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const { items, promoCode } = await request.json() as { items: CartItem[], promoCode?: string }

        if (!items || items.length === 0) {
            return NextResponse.json({ appliedPromotions: [], totalDiscount: 0 })
        }

        const now = new Date()
        const currentDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]
        const currentTime = now.toTimeString().slice(0, 5) // "HH:MM"

        // Fetch active promotions
        const promotions = await prisma.promotion.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                OR: [
                    { startDate: null },
                    { startDate: { lte: now } }
                ]
            },
            include: {
                qualifyingItems: true
            },
            orderBy: { priority: 'desc' }
        })

        const appliedPromotions: AppliedPromotion[] = []
        let totalDiscount = 0
        const usedItemIds = new Set<string>() // Track items already in a deal (for non-stackable)

        for (const promo of promotions) {
            // Check end date
            if (promo.endDate && promo.endDate < now) continue

            // Check day of week
            if (promo.daysOfWeek) {
                const days = JSON.parse(promo.daysOfWeek)
                if (!days.includes(currentDay)) continue
            }

            // Check time window
            if (promo.timeStart && promo.timeEnd) {
                if (currentTime < promo.timeStart || currentTime > promo.timeEnd) continue
            }

            // Check promo code requirement
            if (promo.promoCode && promo.promoCode !== promoCode) continue

            // Find qualifying items based on appliesTo
            let qualifyingCartItems: CartItem[] = []

            if (promo.appliesTo === 'ALL') {
                qualifyingCartItems = items.filter(item => !usedItemIds.has(item.id) || promo.stackable)
            } else if (promo.appliesTo === 'CATEGORY') {
                const categoryIds = promo.qualifyingItems
                    .filter(qi => qi.categoryId && !qi.isExcluded)
                    .map(qi => qi.categoryId)
                const excludedProductIds = promo.qualifyingItems
                    .filter(qi => qi.productId && qi.isExcluded)
                    .map(qi => qi.productId)

                qualifyingCartItems = items.filter(item =>
                    categoryIds.includes(item.categoryId || '') &&
                    !excludedProductIds.includes(item.id) &&
                    (!usedItemIds.has(item.id) || promo.stackable)
                )
            } else if (promo.appliesTo === 'PRODUCTS') {
                const productIds = promo.qualifyingItems
                    .filter(qi => qi.productId && !qi.isExcluded)
                    .map(qi => qi.productId)

                qualifyingCartItems = items.filter(item =>
                    productIds.includes(item.id) &&
                    (!usedItemIds.has(item.id) || promo.stackable)
                )
            }

            if (qualifyingCartItems.length === 0) continue

            // Calculate total quantity of qualifying items
            const totalQualifyingQty = qualifyingCartItems.reduce((sum, item) => sum + item.quantity, 0)

            // Check quantity requirements
            if (promo.requiredQty && totalQualifyingQty < promo.requiredQty) continue

            // Calculate discount based on type
            let discountAmount = 0
            const affectedItemIds: string[] = []

            switch (promo.type) {
                case 'MIX_MATCH': {
                    // Buy X for fixed price
                    if (!promo.requiredQty) continue
                    const sets = Math.floor(totalQualifyingQty / promo.requiredQty)
                    if (sets === 0) continue

                    // Calculate what they would pay normally
                    const sortedItems = [...qualifyingCartItems].sort((a, b) => b.price - a.price)
                    let itemsToPrice = promo.requiredQty * sets
                    let normalPrice = 0
                    for (const item of sortedItems) {
                        const qtyToUse = Math.min(item.quantity, itemsToPrice)
                        normalPrice += item.price * qtyToUse
                        itemsToPrice -= qtyToUse
                        if (qtyToUse > 0) affectedItemIds.push(item.id)
                        if (itemsToPrice <= 0) break
                    }

                    const dealPrice = Number(promo.discountValue) * sets
                    discountAmount = normalPrice - dealPrice
                    break
                }

                case 'BOGO': {
                    // Buy X get Y free/discounted
                    const buyQty = promo.requiredQty || 1
                    const getQty = promo.getQty || 1
                    const sets = Math.floor(totalQualifyingQty / (buyQty + getQty))
                    if (sets === 0) continue

                    // Free items are the cheapest
                    const sortedItems = [...qualifyingCartItems].sort((a, b) => a.price - b.price)
                    let freeItems = getQty * sets
                    for (const item of sortedItems) {
                        const qtyToFree = Math.min(item.quantity, freeItems)
                        if (promo.discountType === 'FREE_ITEM') {
                            discountAmount += item.price * qtyToFree
                        } else if (promo.discountType === 'PERCENT') {
                            discountAmount += item.price * qtyToFree * (Number(promo.discountValue) / 100)
                        }
                        if (qtyToFree > 0) affectedItemIds.push(item.id)
                        freeItems -= qtyToFree
                        if (freeItems <= 0) break
                    }
                    qualifyingCartItems.forEach(item => affectedItemIds.push(item.id))
                    break
                }

                case 'PERCENTAGE': {
                    // X% off qualifying items
                    for (const item of qualifyingCartItems) {
                        discountAmount += item.price * item.quantity * (Number(promo.discountValue) / 100)
                        affectedItemIds.push(item.id)
                    }
                    break
                }

                case 'FIXED': {
                    // $X off per item
                    for (const item of qualifyingCartItems) {
                        discountAmount += Math.min(item.price, Number(promo.discountValue)) * item.quantity
                        affectedItemIds.push(item.id)
                    }
                    break
                }

                case 'THRESHOLD': {
                    // Spend $X get discount
                    const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
                    if (promo.minSpend && cartTotal < Number(promo.minSpend)) continue

                    if (promo.discountType === 'PERCENT') {
                        discountAmount = cartTotal * (Number(promo.discountValue) / 100)
                    } else {
                        discountAmount = Number(promo.discountValue)
                    }
                    items.forEach(item => affectedItemIds.push(item.id))
                    break
                }

                case 'BUNDLE': {
                    // All specified items must be present
                    const requiredProductIds = promo.qualifyingItems
                        .filter(qi => qi.productId && !qi.isExcluded)
                        .map(qi => qi.productId)

                    const presentIds = items.map(i => i.id)
                    const allPresent = requiredProductIds.every(id => presentIds.includes(id!))
                    if (!allPresent) continue

                    const bundleItems = items.filter(i => requiredProductIds.includes(i.id))
                    const normalPrice = bundleItems.reduce((sum, i) => sum + i.price, 0)
                    discountAmount = normalPrice - Number(promo.discountValue)
                    bundleItems.forEach(item => affectedItemIds.push(item.id))
                    break
                }

                case 'TIERED': {
                    // Volume/tiered pricing: 2 for $15, 3 for $20, etc.
                    if (!promo.priceTiers) continue

                    let tiers: { qty: number, price: number }[]
                    try {
                        tiers = JSON.parse(promo.priceTiers as string)
                    } catch {
                        continue
                    }

                    // Sort tiers by qty descending to find the best match
                    tiers.sort((a, b) => b.qty - a.qty)

                    // Find the highest tier that applies
                    let remainingQty = totalQualifyingQty
                    let normalPrice = 0
                    let tierPrice = 0

                    // Calculate normal price
                    for (const item of qualifyingCartItems) {
                        normalPrice += item.price * item.quantity
                        affectedItemIds.push(item.id)
                    }

                    // Apply tiers greedily (largest first)
                    for (const tier of tiers) {
                        while (remainingQty >= tier.qty) {
                            tierPrice += tier.price
                            remainingQty -= tier.qty
                        }
                    }

                    // Add regular price for remaining items
                    if (remainingQty > 0) {
                        // Get the unit price from first item (simplified)
                        const unitPrice = qualifyingCartItems[0]?.price || 0
                        tierPrice += unitPrice * remainingQty
                    }

                    discountAmount = normalPrice - tierPrice
                    break
                }
            }

            if (discountAmount > 0) {
                appliedPromotions.push({
                    promotionId: promo.id,
                    promotionName: promo.name,
                    type: promo.type,
                    discountAmount: Math.round(discountAmount * 100) / 100,
                    affectedItems: [...new Set(affectedItemIds)]
                })
                totalDiscount += discountAmount

                // Mark items as used (for non-stackable)
                if (!promo.stackable) {
                    affectedItemIds.forEach(id => usedItemIds.add(id))
                }
            }
        }

        return NextResponse.json({
            appliedPromotions,
            totalDiscount: Math.round(totalDiscount * 100) / 100
        })
    } catch (error) {
        console.error('[PROMOTIONS_CHECK]', error)
        return NextResponse.json({ error: 'Failed to check promotions' }, { status: 500 })
    }
}

