/**
 * ORO 9 Promotion Engine
 *
 * Auto-applies promotions to cart at checkout.
 * Supports: Buy X Get Y, Percentage off, Fixed amount off, Mix-and-match.
 *
 * Usage:
 *   const results = applyPromotions(cartItems, promotions)
 */

// ============ TYPES ============

export interface CartItem {
    id: string
    itemId: string
    name: string
    price: number
    quantity: number
    categoryId?: string
}

export interface Promotion {
    id: string
    name: string
    type: string // PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y, BOGO
    discountType: string // PERCENT, FIXED, FREE_ITEM
    discountValue: number // 20 for 20%, 5 for $5 off, 100 for free
    requiredQty: number | null // Buy X
    getQty: number | null // Get Y
    minSpend: number | null
    appliesTo: string // ALL, CATEGORY, SPECIFIC_ITEM
    stackable: boolean
    priority: number
    maxUsesPerTransaction: number | null
    qualifyingItems: { categoryId?: string; productId?: string; isExcluded?: boolean }[]
}

export interface PromoResult {
    promotionId: string
    promotionName: string
    type: string
    discount: number // Total $ saved
    affectedItems: string[] // Item IDs affected
    description: string // Human-readable: "Buy 2 Get 1 Free on Energy Drinks"
}

// ============ ENGINE ============

/**
 * Check if a cart item qualifies for a promotion.
 */
function itemQualifies(item: CartItem, promo: Promotion): boolean {
    if (promo.appliesTo === 'ALL') return true

    if (promo.qualifyingItems.length === 0) return true

    for (const q of promo.qualifyingItems) {
        if (q.isExcluded) {
            // Excluded items
            if (q.productId && q.productId === item.itemId) return false
            if (q.categoryId && q.categoryId === item.categoryId) return false
        }
    }

    // Check positive matches
    const hasPositiveRules = promo.qualifyingItems.some(q => !q.isExcluded)
    if (!hasPositiveRules) return true

    for (const q of promo.qualifyingItems) {
        if (q.isExcluded) continue
        if (q.productId && q.productId === item.itemId) return true
        if (q.categoryId && q.categoryId === item.categoryId) return true
    }

    return false
}

/**
 * Apply all applicable promotions to cart items.
 * Returns list of applied promos with discount amounts.
 */
export function applyPromotions(items: CartItem[], promotions: Promotion[]): PromoResult[] {
    const results: PromoResult[] = []

    // Sort by priority (highest first)
    const sorted = [...promotions].sort((a, b) => b.priority - a.priority)

    // Track which items have been used by non-stackable promos
    const usedItems = new Set<string>()

    for (const promo of sorted) {
        // Check max uses
        if (promo.maxUsesPerTransaction !== null) {
            const existingUses = results.filter(r => r.promotionId === promo.id).length
            if (existingUses >= promo.maxUsesPerTransaction) continue
        }

        // Find qualifying items
        const qualifying = items.filter(item =>
            itemQualifies(item, promo) && (!usedItems.has(item.id) || promo.stackable)
        )

        if (qualifying.length === 0) continue

        // Check min spend
        if (promo.minSpend) {
            const cartTotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
            if (cartTotal < promo.minSpend) continue
        }

        if (promo.type === 'BUY_X_GET_Y' || promo.type === 'BOGO') {
            const applied = applyBuyXGetY(qualifying, promo)
            if (applied) {
                results.push(applied)
                if (!promo.stackable) {
                    applied.affectedItems.forEach(id => usedItems.add(id))
                }
            }
        } else if (promo.type === 'PERCENTAGE' || promo.discountType === 'PERCENT') {
            const applied = applyPercentage(qualifying, promo)
            if (applied) {
                results.push(applied)
                if (!promo.stackable) {
                    applied.affectedItems.forEach(id => usedItems.add(id))
                }
            }
        } else if (promo.type === 'FIXED_AMOUNT' || promo.discountType === 'FIXED') {
            const applied = applyFixedAmount(qualifying, promo)
            if (applied) {
                results.push(applied)
                if (!promo.stackable) {
                    applied.affectedItems.forEach(id => usedItems.add(id))
                }
            }
        }
    }

    return results
}

// ============ PROMO TYPES ============

/**
 * Buy X Get Y Free (or at discount).
 * E.g., Buy 2 Get 1 Free → requiredQty=2, getQty=1, discountValue=100 (100% off)
 */
function applyBuyXGetY(items: CartItem[], promo: Promotion): PromoResult | null {
    const requiredQty = promo.requiredQty || 2
    const getQty = promo.getQty || 1
    const totalNeeded = requiredQty + getQty

    // Total qualifying quantity
    const totalQty = items.reduce((s, i) => s + i.quantity, 0)
    if (totalQty < totalNeeded) return null

    // How many times can we apply this deal?
    const timesApplicable = Math.floor(totalQty / totalNeeded)
    if (timesApplicable === 0) return null

    // Sort items by price ascending (cheapest items are the "free" ones)
    const expanded: { item: CartItem; unitPrice: number }[] = []
    for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
            expanded.push({ item, unitPrice: item.price })
        }
    }
    expanded.sort((a, b) => a.unitPrice - b.unitPrice)

    // The cheapest getQty * timesApplicable items get the discount
    const freeCount = getQty * timesApplicable
    let totalDiscount = 0
    const affectedIds: string[] = []

    for (let i = 0; i < Math.min(freeCount, expanded.length); i++) {
        const discountPct = promo.discountValue / 100 // 100 = free, 50 = half off
        totalDiscount += expanded[i].unitPrice * discountPct
        if (!affectedIds.includes(expanded[i].item.id)) {
            affectedIds.push(expanded[i].item.id)
        }
    }

    if (totalDiscount <= 0) return null

    return {
        promotionId: promo.id,
        promotionName: promo.name,
        type: promo.type,
        discount: Math.round(totalDiscount * 100) / 100,
        affectedItems: affectedIds,
        description: `Buy ${requiredQty} Get ${getQty} ${promo.discountValue === 100 ? 'Free' : `${promo.discountValue}% Off`}`
    }
}

/**
 * Percentage discount on qualifying items.
 */
function applyPercentage(items: CartItem[], promo: Promotion): PromoResult | null {
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const discount = total * (promo.discountValue / 100)

    if (discount <= 0) return null

    return {
        promotionId: promo.id,
        promotionName: promo.name,
        type: 'PERCENTAGE',
        discount: Math.round(discount * 100) / 100,
        affectedItems: items.map(i => i.id),
        description: `${promo.discountValue}% off`
    }
}

/**
 * Fixed dollar amount off.
 */
function applyFixedAmount(items: CartItem[], promo: Promotion): PromoResult | null {
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const discount = Math.min(promo.discountValue, total) // Don't discount more than total

    if (discount <= 0) return null

    return {
        promotionId: promo.id,
        promotionName: promo.name,
        type: 'FIXED_AMOUNT',
        discount: Math.round(discount * 100) / 100,
        affectedItems: items.map(i => i.id),
        description: `$${promo.discountValue.toFixed(2)} off`
    }
}

/**
 * Calculate total discount from all applied promotions.
 */
export function totalPromoDiscount(results: PromoResult[]): number {
    return Math.round(results.reduce((s, r) => s + r.discount, 0) * 100) / 100
}
