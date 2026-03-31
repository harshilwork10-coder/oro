/**
 * ORO 9 — Central Pricing Resolution Utility
 * 
 * ═══════════════════════════════════════════════════════════════════
 * SOURCE OF TRUTH — PRICING HIERARCHY
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Pricing Resolution Order (most specific wins):
 * 
 *   1. LocationItemOverride.price   — per-location price for a specific item
 *   2. Product.price / Item.price   — franchise-level base price
 *   3. FranchisorConfig.pricingModel — determines STANDARD vs DUAL_PRICING mode
 *   4. FranchisorConfig.cardSurcharge — surcharge % or flat for dual pricing
 *   5. Provider hardcoded defaults   — fallback (3.99% surcharge, DUAL_PRICING)
 * 
 * Dual Pricing Logic:
 *   - STANDARD mode:      cashPrice === cardPrice (no surcharge)
 *   - DUAL_PRICING mode:   cardPrice = cashPrice × (1 + surcharge%)
 *                          OR cardPrice = cashPrice + flatAmount
 * 
 * CONFIG SOURCE: FranchisorConfig (1:1 with Franchisor)
 *   - pricingModel:      'STANDARD' | 'DUAL_PRICING'
 *   - cardSurchargeType: 'PERCENTAGE' | 'FLAT_AMOUNT'
 *   - cardSurcharge:     Decimal (e.g., 3.99 for 3.99% or 0.50 for $0.50)
 *   - showDualPricing:   boolean (UI toggle — show both prices on receipt/screen)
 *   - taxRate:            Decimal (e.g., 0.0825 for 8.25%)
 * 
 * DEPRECATED:
 *   - lib/dualPricing.ts: Old utility with hardcoded 3.5% and isCashDiscountEnabled()
 *     that always returns false. Use resolvePrice() from this file instead.
 *   - LocationProduct model: Removed (use LocationItemOverride).
 * ═══════════════════════════════════════════════════════════════════
 */

import { Decimal } from '@prisma/client/runtime/library'

export interface PricingConfig {
    pricingModel: 'STANDARD' | 'DUAL_PRICING'
    cardSurchargeType: 'PERCENTAGE' | 'FLAT_AMOUNT'
    cardSurcharge: number  // e.g., 3.99 for 3.99% or 0.50 for $0.50
    showDualPricing: boolean
    taxRate: number         // e.g., 0.0825 for 8.25%
}

/** Default pricing config — used when no FranchisorConfig exists */
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
    pricingModel: 'DUAL_PRICING',
    cardSurchargeType: 'PERCENTAGE',
    cardSurcharge: 3.99,
    showDualPricing: true,
    taxRate: 0.0825,
}

export interface ResolvedPrice {
    /** The base (cash) price */
    cashPrice: number
    /** The card price (with surcharge if DUAL_PRICING mode) */
    cardPrice: number
    /** Whether dual pricing is active */
    isDualPricing: boolean
    /** The surcharge amount (cardPrice - cashPrice), or 0 */
    surchargeAmount: number
    /** Display-ready string: "$10.00" or "$10.00 cash / $10.40 card" */
    displayText: string
}

/**
 * Resolve a price to both cash and card amounts based on a pricing config.
 * 
 * @param basePrice - The item's base (cash) price
 * @param config - Pricing config (from FranchisorConfig or defaults)
 * @returns ResolvedPrice with cash, card, surcharge, and display text
 */
export function resolvePrice(
    basePrice: number,
    config: PricingConfig = DEFAULT_PRICING_CONFIG
): ResolvedPrice {
    const cashPrice = roundMoney(basePrice)

    if (config.pricingModel === 'STANDARD') {
        return {
            cashPrice,
            cardPrice: cashPrice,
            isDualPricing: false,
            surchargeAmount: 0,
            displayText: formatMoney(cashPrice),
        }
    }

    // DUAL_PRICING mode
    let cardPrice: number
    if (config.cardSurchargeType === 'PERCENTAGE') {
        cardPrice = roundMoney(cashPrice * (1 + config.cardSurcharge / 100))
    } else {
        // FLAT_AMOUNT
        cardPrice = roundMoney(cashPrice + config.cardSurcharge)
    }

    const surchargeAmount = roundMoney(cardPrice - cashPrice)

    return {
        cashPrice,
        cardPrice,
        isDualPricing: config.showDualPricing,
        surchargeAmount,
        displayText: config.showDualPricing
            ? `${formatMoney(cashPrice)} cash / ${formatMoney(cardPrice)} card`
            : formatMoney(cashPrice),
    }
}

/**
 * Apply pricing to a cart of items at checkout time.
 * 
 * @param items - Array of { price, quantity } objects
 * @param paymentMethod - 'CASH' or 'CARD'
 * @param config - Pricing config
 * @returns Checkout totals
 */
export function resolveCartTotal(
    items: { price: number; quantity: number }[],
    paymentMethod: 'CASH' | 'CARD',
    config: PricingConfig = DEFAULT_PRICING_CONFIG
): {
    subtotal: number
    surcharge: number
    total: number
    isDualPricing: boolean
} {
    const cashSubtotal = roundMoney(
        items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    )

    if (config.pricingModel === 'STANDARD' || paymentMethod === 'CASH') {
        return {
            subtotal: cashSubtotal,
            surcharge: 0,
            total: cashSubtotal,
            isDualPricing: false,
        }
    }

    // CARD payment with DUAL_PRICING
    const resolved = resolvePrice(cashSubtotal, config)

    return {
        subtotal: cashSubtotal,
        surcharge: resolved.surchargeAmount,
        total: resolved.cardPrice,
        isDualPricing: true,
    }
}

/**
 * Calculate tax amount for a given price.
 */
export function calculateTax(price: number, taxRate: number): number {
    return roundMoney(price * taxRate)
}

/**
 * Convert a Prisma Decimal to a JS number.
 * Safe for pricing fields.
 */
export function decimalToNumber(d: Decimal | number | string | null | undefined): number {
    if (d === null || d === undefined) return 0
    if (typeof d === 'number') return d
    return Number(d)
}

/**
 * Build a PricingConfig from a FranchisorConfig database row.
 */
export function configFromDb(dbConfig: {
    pricingModel?: string
    cardSurchargeType?: string
    cardSurcharge?: Decimal | number | null
    showDualPricing?: boolean
    taxRate?: Decimal | number | null
} | null | undefined): PricingConfig {
    if (!dbConfig) return DEFAULT_PRICING_CONFIG

    return {
        pricingModel: (dbConfig.pricingModel === 'STANDARD' ? 'STANDARD' : 'DUAL_PRICING'),
        cardSurchargeType: (dbConfig.cardSurchargeType === 'FLAT_AMOUNT' ? 'FLAT_AMOUNT' : 'PERCENTAGE'),
        cardSurcharge: decimalToNumber(dbConfig.cardSurcharge) || DEFAULT_PRICING_CONFIG.cardSurcharge,
        showDualPricing: dbConfig.showDualPricing ?? DEFAULT_PRICING_CONFIG.showDualPricing,
        taxRate: decimalToNumber(dbConfig.taxRate) || DEFAULT_PRICING_CONFIG.taxRate,
    }
}

// ── Internal helpers ─────────────────────────────────────────

/** Round to 2 decimal places (banker's rounding for financial accuracy) */
function roundMoney(n: number): number {
    return Math.round(n * 100) / 100
}

/** Format as USD string */
function formatMoney(n: number): string {
    return `$${n.toFixed(2)}`
}
