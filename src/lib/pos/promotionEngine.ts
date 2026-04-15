import { prisma } from '@/lib/prisma'

/**
 * Sprint 1: Server-Owned Promotion Engine
 *
 * Single source of truth for computing promotions against a DB-validated cart.
 * Used by both:
 *   - POST /api/pos/transaction (direct checkout: CASH, legacy card)
 *   - POST /api/pos/transaction/reserve (Phase 1 of card checkout)
 *
 * This engine:
 *   - Loads active promotions from the DB
 *   - Validates date/day/time windows
 *   - Validates promo code requirements
 *   - Matches products/categories using DB-backed cart data
 *   - Computes line-level discount allocation
 *   - Builds immutable promo snapshot output
 *
 * This engine does NOT:
 *   - Accept client promo allocations as truth
 *   - Accept client pricing as truth
 *   - Modify any database records
 *
 * FAILURE POLICY:
 *   If the promo engine throws, checkout continues with ZERO promotions.
 *   Rationale:
 *     1. A promo failure should never block a sale (customer has goods, clerk is waiting)
 *     2. The receipt/transaction records appliedPromotions=null, promoDiscount=0
 *     3. Reports show the sale at full price — no phantom discounts
 *     4. If the customer deserved a discount, a manager can issue a post-sale adjustment
 *   This is the safest default for POS: never block revenue, never create phantom discounts.
 */

// ============ TYPES ============

/** Cart item prepared from DB-validated product data */
export interface PromoCartItem {
    id: string            // Product or Service ID
    categoryId?: string   // ProductCategory ID (for category-scoped promos)
    price: number         // SERVER-resolved DB price (never client price)
    quantity: number      // Item quantity
}

/** Input contract for the promotion engine */
export interface PromoEngineInput {
    franchiseId: string
    cartItems: PromoCartItem[]    // Built from DB truth — no raw client data
    promoCode?: string | null     // Optional promo code submitted by client
    loyaltyId?: string | null     // For loyalty-gated promos (future)
    requestTime?: Date            // Defaults to now() if not provided
}

/** One applied promotion with immutable rule snapshot */
export interface AppliedPromotion {
    promotionId: string
    promotionName: string
    type: string
    discountAmount: number        // Total discount for this promo (rounded to 2 decimals)
    affectedItems: string[]       // IDs of cart items this promo discounts
    ruleSnapshot: {
        discountType: string | null
        discountValue: number
        requiredQty: number | null
        getQty: number | null
        appliesTo: string | null
        stackable: boolean
        promoCode: string | null
    }
}

/** Per-line promo allocation (for TransactionLineItem fields) */
export interface LinePromoAllocation {
    promotionId: string
    promotionName: string
    promotionDiscount: number     // Discount allocated to this specific line
}

/** Full output from the promotion engine */
export interface PromoEngineResult {
    appliedPromotions: AppliedPromotion[]
    linePromoMap: Map<string, LinePromoAllocation>
    totalPromoDiscount: number
    warnings: string[]            // Non-fatal skip reasons
}

// ============ MAIN ENGINE ============

/**
 * Compute server-owned promotions for a DB-validated cart.
 *
 * @param input - Typed input with franchiseId, DB-priced cart items, optional promoCode
 * @returns PromoEngineResult with applied promos, per-line map, and total discount
 *
 * @example
 * const result = await computePromotions({
 *     franchiseId: user.franchiseId,
 *     cartItems: cartSnapshot.filter(i => i.id).map(i => ({
 *         id: i.id!, categoryId: i.categoryId, price: i.dbPrice, quantity: i.quantity,
 *     })),
 *     promoCode: promoCode || null,
 * })
 */
export async function computePromotions(input: PromoEngineInput): Promise<PromoEngineResult> {
    const { franchiseId, cartItems, promoCode, requestTime } = input
    const warnings: string[] = []

    const now = requestTime || new Date()
    const currentDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]
    const currentTime = now.toTimeString().slice(0, 5)

    // Load active promotions from DB
    const activePromos = await prisma.promotion.findMany({
        where: {
            franchiseId,
            isActive: true,
            OR: [
                { startDate: null },
                { startDate: { lte: now } }
            ]
        },
        include: { qualifyingItems: true },
        orderBy: { priority: 'desc' }
    })

    const appliedPromotions: AppliedPromotion[] = []
    let totalPromoDiscount = 0
    const usedItemIds = new Set<string>()

    for (const promo of activePromos) {
        // ── Date window check ──
        if (promo.endDate && promo.endDate < now) {
            continue
        }

        // ── Day-of-week check ──
        if (promo.daysOfWeek) {
            try {
                const days = JSON.parse(promo.daysOfWeek)
                if (!days.includes(currentDay)) continue
            } catch {
                warnings.push(`Promo ${promo.id}: invalid daysOfWeek JSON, skipped`)
                continue
            }
        }

        // ── Time window check ──
        if (promo.timeStart && promo.timeEnd) {
            if (currentTime < promo.timeStart || currentTime > promo.timeEnd) continue
        }

        // ── Promo code check ──
        if (promo.promoCode && promo.promoCode !== promoCode) continue

        // ── Build qualifying items using SERVER (DB) prices ──
        let qualifyingCartItems = cartItems.filter(i => !usedItemIds.has(i.id) || promo.stackable)

        if (promo.appliesTo === 'CATEGORY') {
            const catIds = promo.qualifyingItems
                .filter(qi => qi.categoryId && !qi.isExcluded)
                .map(qi => qi.categoryId)
            const excludedIds = promo.qualifyingItems
                .filter(qi => qi.productId && qi.isExcluded)
                .map(qi => qi.productId)
            qualifyingCartItems = qualifyingCartItems.filter(i =>
                catIds.includes(i.categoryId || '') && !excludedIds.includes(i.id)
            )
        } else if (promo.appliesTo === 'PRODUCTS') {
            const prodIds = promo.qualifyingItems
                .filter(qi => qi.productId && !qi.isExcluded)
                .map(qi => qi.productId)
            qualifyingCartItems = qualifyingCartItems.filter(i => prodIds.includes(i.id))
        }
        // appliesTo === 'ALL' keeps all items

        if (qualifyingCartItems.length === 0) continue

        // ── Quantity threshold check ──
        const totalQualifyingQty = qualifyingCartItems.reduce((s, i) => s + i.quantity, 0)
        if (promo.requiredQty && totalQualifyingQty < promo.requiredQty) continue

        // ── Core discount calculation ──
        let discountAmount = 0
        const affectedItemIds: string[] = []

        switch (promo.type) {
            case 'PERCENTAGE': {
                for (const item of qualifyingCartItems) {
                    discountAmount += item.price * item.quantity * (Number(promo.discountValue) / 100)
                    affectedItemIds.push(item.id)
                }
                break
            }
            case 'FIXED': {
                for (const item of qualifyingCartItems) {
                    discountAmount += Math.min(item.price, Number(promo.discountValue)) * item.quantity
                    affectedItemIds.push(item.id)
                }
                break
            }
            case 'MIX_MATCH': {
                if (!promo.requiredQty) continue
                const sets = Math.floor(totalQualifyingQty / promo.requiredQty)
                if (sets === 0) continue
                const sorted = [...qualifyingCartItems].sort((a, b) => b.price - a.price)
                let itemsToPrice = promo.requiredQty * sets
                let normalPrice = 0
                for (const item of sorted) {
                    const qtyToUse = Math.min(item.quantity, itemsToPrice)
                    normalPrice += item.price * qtyToUse
                    itemsToPrice -= qtyToUse
                    if (qtyToUse > 0) affectedItemIds.push(item.id)
                    if (itemsToPrice <= 0) break
                }
                discountAmount = normalPrice - (Number(promo.discountValue) * sets)
                break
            }
            case 'BOGO': {
                const buyQty = promo.requiredQty || 1
                const getQty = promo.getQty || 1
                const bogoSets = Math.floor(totalQualifyingQty / (buyQty + getQty))
                if (bogoSets === 0) continue
                const sorted = [...qualifyingCartItems].sort((a, b) => a.price - b.price)
                let freeItems = getQty * bogoSets
                for (const item of sorted) {
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
            case 'THRESHOLD': {
                const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
                if (promo.minSpend && cartTotal < Number(promo.minSpend)) continue
                if (promo.discountType === 'PERCENT') {
                    discountAmount = cartTotal * (Number(promo.discountValue) / 100)
                } else {
                    discountAmount = Number(promo.discountValue)
                }
                cartItems.forEach(item => affectedItemIds.push(item.id))
                break
            }
            default:
                // TIERED, HAPPY_HOUR, etc. — not supported in Sprint 1
                warnings.push(`Promo ${promo.id} (${promo.name}): type '${promo.type}' not supported yet, skipped`)
                continue
        }

        if (discountAmount > 0) {
            appliedPromotions.push({
                promotionId: promo.id,
                promotionName: promo.name,
                type: promo.type,
                discountAmount: Math.round(discountAmount * 100) / 100,
                affectedItems: [...new Set(affectedItemIds)],
                ruleSnapshot: {
                    discountType: promo.discountType,
                    discountValue: Number(promo.discountValue),
                    requiredQty: promo.requiredQty,
                    getQty: promo.getQty,
                    appliesTo: promo.appliesTo,
                    stackable: promo.stackable,
                    promoCode: promo.promoCode,
                }
            })
            totalPromoDiscount += discountAmount
            if (!promo.stackable) {
                affectedItemIds.forEach(id => usedItemIds.add(id))
            }
        }
    }

    totalPromoDiscount = Math.round(totalPromoDiscount * 100) / 100

    // ── Build per-line promo allocation map ──
    const linePromoMap = new Map<string, LinePromoAllocation>()
    for (const promo of appliedPromotions) {
        const perItemDiscount = promo.discountAmount / Math.max(promo.affectedItems.length, 1)
        for (const itemId of promo.affectedItems) {
            const existing = linePromoMap.get(itemId)
            if (!existing || perItemDiscount > existing.promotionDiscount) {
                linePromoMap.set(itemId, {
                    promotionId: promo.promotionId,
                    promotionName: promo.promotionName,
                    promotionDiscount: Math.round(perItemDiscount * 100) / 100,
                })
            }
        }
    }

    return {
        appliedPromotions,
        linePromoMap,
        totalPromoDiscount,
        warnings,
    }
}

// ============ SAFE WRAPPER ============

/**
 * Same as computePromotions but catches errors and returns empty results.
 * This is the safe wrapper used by checkout routes.
 *
 * FAILURE POLICY: Checkout continues with zero promotions.
 * - Receipt shows full price
 * - No phantom discounts
 * - Manager can issue post-sale adjustment if customer deserved a discount
 */
export async function computePromotionsSafe(input: PromoEngineInput): Promise<PromoEngineResult> {
    try {
        return await computePromotions(input)
    } catch (error) {
        console.error('[PROMO_ENGINE_SAFE]', error)
        return {
            appliedPromotions: [],
            linePromoMap: new Map(),
            totalPromoDiscount: 0,
            warnings: [`Promotion engine error: ${(error as Error).message?.slice(0, 200) || 'Unknown error'}. Checkout continuing with no promo.`],
        }
    }
}
