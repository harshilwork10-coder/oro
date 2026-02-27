/**
 * ORO 9 Pricing Engine
 * 
 * Calculates sell price from cost using department pricing rules.
 * Supports: MARKUP%, TARGET_MARGIN%, tiered rates, rounding, min/max, price locking.
 * 
 * Usage:
 *   const price = calculatePrice(cost, rule)
 *   const price = calculatePriceFromTiers(cost, tiers, rounding, caps)
 */

// ============ TYPES ============

export interface PricingTier {
    minCost: number
    maxCost: number
    markupPct: number        // e.g. 0.28 for 28% markup
    minGrossProfit: number   // minimum $ profit per unit
}

export interface PricingCaps {
    minPrice: number         // floor price (never sell below)
    maxMarkupPct: number     // ceiling markup (never exceed)
}

export type RoundingMethod = 'UP_TO_99' | 'UP_TO_49' | 'NEAREST_05' | 'NEAREST_01' | 'NO_ROUND'

export interface PricingRuleConfig {
    method: 'MARKUP' | 'TARGET_MARGIN'
    tiers: PricingTier[]
    rounding: RoundingMethod
    caps: PricingCaps
    lockIfMsrpPresent?: boolean
    managerOverrideOnly?: boolean
}

// ============ ROUNDING ============

/**
 * Apply rounding method to a raw price.
 * - UP_TO_99:   ceil to next $X.99 (e.g. 10.01 → 10.99, 10.99 stays)
 * - UP_TO_49:   ceil to next $X.49 (e.g. 2.10 → 2.49, 2.50 → 3.49)
 * - NEAREST_05: round to nearest $0.05
 * - NEAREST_01: normal cents rounding
 * - NO_ROUND:   keep exact calculated value
 */
export function applyRounding(rawPrice: number, method: RoundingMethod): number {
    switch (method) {
        case 'UP_TO_99': {
            const whole = Math.floor(rawPrice)
            const cents = rawPrice - whole
            // If already exactly .99, keep it
            if (Math.abs(cents - 0.99) < 0.001) return rawPrice
            // If cents > .99, go to next dollar .99
            if (cents > 0.99) return whole + 1.99
            // Otherwise ceil to current dollar .99
            return whole + 0.99
        }
        case 'UP_TO_49': {
            const whole = Math.floor(rawPrice)
            const cents = rawPrice - whole
            if (Math.abs(cents - 0.49) < 0.001) return rawPrice
            if (cents > 0.49) return whole + 1.49
            return whole + 0.49
        }
        case 'NEAREST_05': {
            return Math.round(rawPrice * 20) / 20
        }
        case 'NEAREST_01': {
            return Math.round(rawPrice * 100) / 100
        }
        case 'NO_ROUND':
        default:
            return Math.round(rawPrice * 100) / 100
    }
}

// ============ PRICE CALCULATION ============

/**
 * Find the matching tier for a given cost.
 */
function findTier(cost: number, tiers: PricingTier[]): PricingTier | null {
    // Sort tiers by minCost ascending
    const sorted = [...tiers].sort((a, b) => a.minCost - b.minCost)
    for (const tier of sorted) {
        if (cost >= tier.minCost && cost <= tier.maxCost) {
            return tier
        }
    }
    // Fallback: use last tier if cost exceeds all tiers
    return sorted.length > 0 ? sorted[sorted.length - 1] : null
}

/**
 * Calculate sell price from cost + pricing rule config.
 * 
 * Formula (MARKUP):
 *   rawPrice = max(cost * (1 + markupPct), cost + minGrossProfit)
 * 
 * Formula (TARGET_MARGIN):
 *   rawPrice = max(cost / (1 - marginPct), cost + minGrossProfit)
 * 
 * Then apply: rounding → min/max caps
 */
export function calculatePrice(
    cost: number,
    config: PricingRuleConfig,
    options?: {
        overrideMarkup?: number | null  // per-item override
        msrp?: number | null
        priceLocked?: boolean
        currentPrice?: number
    }
): { price: number; method: string; tier: PricingTier | null; wasLocked: boolean } {
    // 1. If price locked, don't change
    if (options?.priceLocked && options.currentPrice !== undefined) {
        return { price: options.currentPrice, method: 'LOCKED', tier: null, wasLocked: true }
    }

    // 2. If MSRP present and rule says lock to MSRP
    if (config.lockIfMsrpPresent && options?.msrp && options.msrp > 0) {
        return { price: Number(options.msrp), method: 'MSRP', tier: null, wasLocked: false }
    }

    // 3. If cost is 0 or negative, can't calculate
    if (!cost || cost <= 0) {
        return { price: options?.currentPrice || 0, method: 'NO_COST', tier: null, wasLocked: false }
    }

    // 4. Find matching tier
    const tier = findTier(cost, config.tiers)
    if (!tier) {
        return { price: options?.currentPrice || cost, method: 'NO_TIER', tier: null, wasLocked: false }
    }

    // 5. Use per-item override markup if available
    const markupPct = options?.overrideMarkup != null ? Number(options.overrideMarkup) : tier.markupPct

    // 6. Calculate raw price
    let rawPrice: number
    if (config.method === 'TARGET_MARGIN') {
        // sell = cost / (1 - marginPct)
        const marginPrice = markupPct >= 1 ? cost * 10 : cost / (1 - markupPct)
        rawPrice = Math.max(marginPrice, cost + tier.minGrossProfit)
    } else {
        // MARKUP (default): sell = cost * (1 + markupPct)
        rawPrice = Math.max(cost * (1 + markupPct), cost + tier.minGrossProfit)
    }

    // 7. Apply max markup cap
    const maxPrice = cost * (1 + config.caps.maxMarkupPct)
    if (rawPrice > maxPrice) {
        rawPrice = maxPrice
    }

    // 8. Apply rounding
    let price = applyRounding(rawPrice, config.rounding)

    // 9. Apply min price floor
    if (price < config.caps.minPrice) {
        price = config.caps.minPrice
    }

    // 10. Final safety: never sell below cost
    if (price < cost) {
        price = applyRounding(cost * 1.01, config.rounding)
    }

    return {
        price: Math.round(price * 100) / 100,
        method: config.method,
        tier,
        wasLocked: false
    }
}

// ============ DEFAULT RULES ============

export const DEFAULT_PRICING_RULES: Record<string, PricingRuleConfig> = {
    BEER_PACKS: {
        method: 'MARKUP',
        rounding: 'UP_TO_99',
        tiers: [{ minCost: 0, maxCost: 999999, markupPct: 0.28, minGrossProfit: 1.25 }],
        caps: { minPrice: 0.99, maxMarkupPct: 0.50 }
    },
    BEER_SINGLES: {
        method: 'MARKUP',
        rounding: 'UP_TO_49',
        tiers: [{ minCost: 0, maxCost: 999999, markupPct: 0.45, minGrossProfit: 0.75 }],
        caps: { minPrice: 0.99, maxMarkupPct: 0.90 }
    },
    SPIRITS: {
        method: 'MARKUP',
        rounding: 'UP_TO_99',
        tiers: [
            { minCost: 0, maxCost: 14.99, markupPct: 0.45, minGrossProfit: 2.00 },
            { minCost: 15.0, maxCost: 39.99, markupPct: 0.35, minGrossProfit: 3.00 },
            { minCost: 40.0, maxCost: 999999, markupPct: 0.25, minGrossProfit: 6.00 }
        ],
        caps: { minPrice: 4.99, maxMarkupPct: 0.80 }
    },
    WINE: {
        method: 'MARKUP',
        rounding: 'UP_TO_99',
        tiers: [
            { minCost: 0, maxCost: 9.99, markupPct: 0.60, minGrossProfit: 2.50 },
            { minCost: 10.0, maxCost: 24.99, markupPct: 0.40, minGrossProfit: 4.00 },
            { minCost: 25.0, maxCost: 999999, markupPct: 0.28, minGrossProfit: 7.00 }
        ],
        caps: { minPrice: 6.99, maxMarkupPct: 0.90 }
    },
    PACKAGED_BEVERAGES: {
        method: 'MARKUP',
        rounding: 'UP_TO_49',
        tiers: [
            { minCost: 0, maxCost: 0.99, markupPct: 1.00, minGrossProfit: 0.75 },
            { minCost: 1.0, maxCost: 2.49, markupPct: 0.70, minGrossProfit: 0.90 },
            { minCost: 2.5, maxCost: 999999, markupPct: 0.55, minGrossProfit: 1.25 }
        ],
        caps: { minPrice: 0.99, maxMarkupPct: 1.50 }
    },
    SNACKS_CANDY: {
        method: 'MARKUP',
        rounding: 'UP_TO_49',
        tiers: [
            { minCost: 0, maxCost: 0.99, markupPct: 1.10, minGrossProfit: 0.65 },
            { minCost: 1.0, maxCost: 2.99, markupPct: 0.75, minGrossProfit: 0.90 },
            { minCost: 3.0, maxCost: 999999, markupPct: 0.55, minGrossProfit: 1.25 }
        ],
        caps: { minPrice: 0.99, maxMarkupPct: 2.00 }
    },
    TOBACCO_CIG: {
        method: 'MARKUP',
        rounding: 'UP_TO_99',
        tiers: [{ minCost: 0, maxCost: 999999, markupPct: 0.12, minGrossProfit: 0.35 }],
        caps: { minPrice: 0.99, maxMarkupPct: 0.25 },
        lockIfMsrpPresent: true,
        managerOverrideOnly: true
    },
    TOBACCO_OTHER_VAPE: {
        method: 'MARKUP',
        rounding: 'UP_TO_99',
        tiers: [
            { minCost: 0, maxCost: 9.99, markupPct: 0.70, minGrossProfit: 2.00 },
            { minCost: 10.0, maxCost: 999999, markupPct: 0.50, minGrossProfit: 4.00 }
        ],
        caps: { minPrice: 4.99, maxMarkupPct: 1.50 }
    },
    GROCERY_GENERAL: {
        method: 'MARKUP',
        rounding: 'NEAREST_05',
        tiers: [{ minCost: 0, maxCost: 999999, markupPct: 0.35, minGrossProfit: 0.75 }],
        caps: { minPrice: 0.99, maxMarkupPct: 1.00 }
    }
}

// Category name → rule mapping hints
export const DEFAULT_CATEGORY_MAPPINGS: { keywords: string[]; ruleId: string }[] = [
    { keywords: ['beer', 'ipa', 'lager', 'ale', 'stout'], ruleId: 'BEER_PACKS' },
    { keywords: ['single', 'tallboy'], ruleId: 'BEER_SINGLES' },
    { keywords: ['liquor', 'spirits', 'whiskey', 'vodka', 'rum', 'tequila', 'gin', 'brandy'], ruleId: 'SPIRITS' },
    { keywords: ['wine', 'champagne', 'prosecco'], ruleId: 'WINE' },
    { keywords: ['soda', 'energy', 'water', 'beverage', 'drink', 'juice'], ruleId: 'PACKAGED_BEVERAGES' },
    { keywords: ['snack', 'chips', 'candy', 'chocolate', 'gum'], ruleId: 'SNACKS_CANDY' },
    { keywords: ['cigarette'], ruleId: 'TOBACCO_CIG' },
    { keywords: ['tobacco', 'vape', 'cigar', 'wrap', 'hookah'], ruleId: 'TOBACCO_OTHER_VAPE' },
    { keywords: ['grocery', 'household', 'cleaning', 'paper'], ruleId: 'GROCERY_GENERAL' }
]
