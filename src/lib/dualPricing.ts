import { prisma } from '@/lib/prisma'

// Provider-level settings (YOU control the percentage)
export interface ProviderSettings {
    cashDiscountPercent: number // e.g., 3.5 for 3.5%
    platformName: string
    supportEmail: string
}

// Get provider settings
export function getProviderSettings(): ProviderSettings {
    return {
        cashDiscountPercent: 3.5, // YOU set this percentage for ALL clients
        platformName: 'Aura POS',
        supportEmail: 'support@aurapos.com'
    }
}

/**
 * Check if cash discount is enabled for a specific franchisor
 * ONLY PROVIDER can enable this
 */
export async function isCashDiscountEnabled(franchisorId: string): Promise<boolean> {
    const franchisor = await prisma.franchisor.findUnique({
        where: { id: franchisorId },
        select: { cashDiscountEnabled: true }
    })

    return franchisor?.cashDiscountEnabled || false
}

/**
 * Calculate card price from cash price using provider's cash discount
 * @param cashPrice - Base cash price (what they enter: $10)
 * @param franchisorId - Salon owner ID to check if enabled
 * @returns Card price with discount added ($10.35 if 3.5%)
 */
export async function calculateCardPrice(
    cashPrice: number,
    franchisorId: string
): Promise<number> {
    const enabled = await isCashDiscountEnabled(franchisorId)

    if (!enabled) {
        return cashPrice // No dual pricing for this salon
    }

    const settings = getProviderSettings()

    // Card price = Cash price × (1 + discount%)
    // Example: $10 × 1.035 = $10.35
    const cardPrice = cashPrice * (1 + settings.cashDiscountPercent / 100)

    // Round to 2 decimals
    return Math.round(cardPrice * 100) / 100
}

/**
 * Calculate cash price from card price (reverse)
 * @param cardPrice - Card price
 * @param franchisorId - Salon owner ID
 * @returns Cash price
 */
export async function calculateCashPrice(
    cardPrice: number,
    franchisorId: string
): Promise<number> {
    const enabled = await isCashDiscountEnabled(franchisorId)

    if (!enabled) {
        return cardPrice
    }

    const settings = getProviderSettings()

    // Cash price = Card price / (1 + discount%)
    // Example: $10.35 / 1.035 = $10
    const cashPrice = cardPrice / (1 + settings.cashDiscountPercent / 100)

    return Math.round(cashPrice * 100) / 100
}

/**
 * Get price display for UI
 * Shows both cash and card prices
 */
export async function formatDualPrice(
    cashPrice: number,
    franchisorId: string
): Promise<{
    cashPrice: number
    cardPrice: number
    displayText: string
    enabled: boolean
}> {
    const enabled = await isCashDiscountEnabled(franchisorId)
    const cardPrice = await calculateCardPrice(cashPrice, franchisorId)

    return {
        cashPrice,
        cardPrice,
        displayText: enabled
            ? `$${cashPrice.toFixed(2)} cash / $${cardPrice.toFixed(2)} card`
            : `$${cashPrice.toFixed(2)}`,
        enabled
    }
}

/**
 * Apply cash discount at checkout
 * @param items - Cart items
 * @param paymentMethod - 'CASH' or 'CARD'
 * @param franchisorId - Salon owner ID
 * @returns Total with appropriate pricing
 */
export async function applyDualPricing(
    items: { cashPrice: number; quantity: number }[],
    paymentMethod: 'CASH' | 'CARD',
    franchisorId: string
): Promise<{
    subtotal: number
    cashDiscount: number
    total: number
}> {
    const enabled = await isCashDiscountEnabled(franchisorId)

    const cashSubtotal = items.reduce(
        (sum, item) => sum + item.cashPrice * item.quantity,
        0
    )

    if (!enabled || paymentMethod === 'CASH') {
        return {
            subtotal: cashSubtotal,
            cashDiscount: 0,
            total: cashSubtotal
        }
    }

    // Paying with card - add cash discount
    const cardTotal = await calculateCardPrice(cashSubtotal, franchisorId)
    const discountAmount = cardTotal - cashSubtotal

    return {
        subtotal: cashSubtotal,
        cashDiscount: discountAmount,
        total: cardTotal
    }
}
