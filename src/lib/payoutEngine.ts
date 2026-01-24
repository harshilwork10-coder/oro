/**
 * Payout Engine - Single Source of Truth for Commission/Payout Math
 * 
 * All financial calculations for barber commissions, tips, and owner amounts
 * are computed here and snapshotted at checkout. Reports only sum these snapshots.
 * 
 * RULE: After checkout, these values are NEVER recalculated.
 */

// ============ TYPES ============

export interface PayoutConfig {
    commissionSplit: number           // Default: 50 (means 50% to barber)
    tipHandling: 'BARBER_KEEPS' | 'SPLIT' | 'OWNER_KEEPS'
    taxRate: number                   // Tax rate as percentage (e.g., 8.25)
}

export interface LineItemInput {
    type: 'SERVICE' | 'PRODUCT'
    price: number                     // Unit price
    quantity: number                  // Quantity
    discount: number                  // Discount amount on this item
    serviceId?: string | null
    serviceName?: string | null
    productId?: string | null
    productName?: string | null
    barberId?: string | null          // Staff who performed the service
}

export interface LineItemSnapshot {
    serviceNameSnapshot: string | null
    productNameSnapshot: string | null
    priceCharged: number              // price * quantity
    discountAllocated: number         // Discount on this line
    taxAllocated: number              // Tax on this line
    tipAllocated: number              // Tip allocated to this line (services only)
    commissionSplitUsed: number       // Commission % used (e.g., 50)
    commissionAmount: number          // Amount barber earns
    ownerAmount: number               // Amount owner keeps
    businessDate: Date                // Business date in location timezone
    lineItemStatus: 'PAID' | 'REFUNDED' | 'VOIDED'
}

export interface TransactionPayoutResult {
    lineItemSnapshots: LineItemSnapshot[]
    totals: {
        subtotal: number
        discountTotal: number
        taxTotal: number
        tipTotal: number
        grandTotal: number
        commissionTotal: number
        ownerTotal: number
    }
}

// ============ DEFAULT CONFIG ============

export const DEFAULT_PAYOUT_CONFIG: PayoutConfig = {
    commissionSplit: 40,              // 40% to barber by default
    tipHandling: 'BARBER_KEEPS',      // Barber keeps tips by default
    taxRate: 0                        // No default tax, should be passed in
}

// ============ HELPERS ============

/**
 * Get business date for a location timezone
 * For now, uses local date. TODO: Support location timezones
 */
export function getBusinessDate(locationTimezone?: string): Date {
    const now = new Date()
    // Reset to start of day for consistent business date
    now.setHours(0, 0, 0, 0)
    return now
}

/**
 * Round to 2 decimal places for currency
 */
function roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100
}

// ============ MAIN CALCULATION ============

/**
 * Calculate payout snapshot for a single line item
 * 
 * @param item - The line item input
 * @param tipForItem - Tip amount allocated to this line item
 * @param config - Payout configuration
 * @param businessDate - Business date for this transaction
 * @returns Immutable snapshot to store in database
 */
export function calculateLineItemSnapshot(
    item: LineItemInput,
    tipForItem: number,
    config: PayoutConfig,
    businessDate: Date
): LineItemSnapshot {
    // Calculate base amounts
    const priceCharged = roundCurrency(item.price * item.quantity)
    const discountAllocated = roundCurrency(item.discount)
    const netAmount = roundCurrency(priceCharged - discountAllocated)

    // Calculate tax on net amount
    const taxAllocated = roundCurrency(netAmount * (config.taxRate / 100))

    // Commission calculation (only for services with assigned staff)
    let commissionSplitUsed = 0
    let commissionAmount = 0
    let ownerAmount = netAmount  // Owner keeps all by default

    if (item.type === 'SERVICE' && item.barberId) {
        commissionSplitUsed = config.commissionSplit
        commissionAmount = roundCurrency(netAmount * (commissionSplitUsed / 100))
        ownerAmount = roundCurrency(netAmount - commissionAmount)
    }

    // For products, owner keeps everything
    if (item.type === 'PRODUCT') {
        commissionSplitUsed = 0
        commissionAmount = 0
        ownerAmount = netAmount
    }

    // Tip allocation (only for services with assigned staff)
    let tipAllocated = 0
    if (item.type === 'SERVICE' && item.barberId) {
        switch (config.tipHandling) {
            case 'BARBER_KEEPS':
                tipAllocated = roundCurrency(tipForItem)
                break
            case 'SPLIT':
                tipAllocated = roundCurrency(tipForItem * (config.commissionSplit / 100))
                break
            case 'OWNER_KEEPS':
                tipAllocated = 0
                break
        }
    }

    return {
        serviceNameSnapshot: item.serviceName || null,
        productNameSnapshot: item.productName || null,
        priceCharged,
        discountAllocated,
        taxAllocated,
        tipAllocated,
        commissionSplitUsed,
        commissionAmount,
        ownerAmount,
        businessDate,
        lineItemStatus: 'PAID'
    }
}

/**
 * Calculate payout snapshots for an entire transaction
 * 
 * @param items - All line items in the transaction
 * @param totalTip - Total tip for the transaction
 * @param config - Payout configuration
 * @param businessDate - Business date for this transaction
 * @returns All snapshots plus totals
 */
export function calculateTransactionPayouts(
    items: LineItemInput[],
    totalTip: number,
    config: PayoutConfig,
    businessDate: Date
): TransactionPayoutResult {
    // Count services with barbers for tip distribution
    const servicesWithBarber = items.filter(i => i.type === 'SERVICE' && i.barberId)
    const tipPerService = servicesWithBarber.length > 0
        ? roundCurrency(totalTip / servicesWithBarber.length)
        : 0

    // Calculate snapshot for each line item
    const lineItemSnapshots: LineItemSnapshot[] = items.map(item => {
        const hasBarber = item.type === 'SERVICE' && item.barberId
        const tipForItem = hasBarber ? tipPerService : 0
        return calculateLineItemSnapshot(item, tipForItem, config, businessDate)
    })

    // Calculate totals
    const totals = {
        subtotal: roundCurrency(lineItemSnapshots.reduce((sum, s) => sum + s.priceCharged, 0)),
        discountTotal: roundCurrency(lineItemSnapshots.reduce((sum, s) => sum + s.discountAllocated, 0)),
        taxTotal: roundCurrency(lineItemSnapshots.reduce((sum, s) => sum + s.taxAllocated, 0)),
        tipTotal: roundCurrency(lineItemSnapshots.reduce((sum, s) => sum + s.tipAllocated, 0)),
        grandTotal: 0,
        commissionTotal: roundCurrency(lineItemSnapshots.reduce((sum, s) => sum + s.commissionAmount, 0)),
        ownerTotal: roundCurrency(lineItemSnapshots.reduce((sum, s) => sum + s.ownerAmount, 0))
    }

    // Grand total = subtotal - discount + tax + tip
    totals.grandTotal = roundCurrency(
        totals.subtotal - totals.discountTotal + totals.taxTotal + totals.tipTotal
    )

    return { lineItemSnapshots, totals }
}

/**
 * Create reversal snapshots for a refund
 * 
 * RULE: Refunds are recorded as negative line items, NEVER as edits to existing data
 * 
 * @param originalSnapshots - The original line item snapshots to reverse
 * @returns Negative snapshots for refund recording
 */
export function createRefundReversals(
    originalSnapshots: LineItemSnapshot[]
): LineItemSnapshot[] {
    return originalSnapshots.map(snapshot => ({
        ...snapshot,
        priceCharged: -snapshot.priceCharged,
        discountAllocated: -snapshot.discountAllocated,
        taxAllocated: -snapshot.taxAllocated,
        tipAllocated: -snapshot.tipAllocated,
        commissionAmount: -snapshot.commissionAmount,
        ownerAmount: -snapshot.ownerAmount,
        lineItemStatus: 'REFUNDED' as const
    }))
}

// ============ INVARIANTS (for testing) ============

/**
 * Validate that commission + owner = net amount
 * This invariant must ALWAYS hold
 */
export function validateCommissionInvariant(snapshot: LineItemSnapshot): boolean {
    const netAmount = roundCurrency(snapshot.priceCharged - snapshot.discountAllocated)
    const sumOfSplit = roundCurrency(snapshot.commissionAmount + snapshot.ownerAmount)
    return Math.abs(netAmount - sumOfSplit) < 0.01 // Allow for rounding
}

/**
 * Validate that a sale + its refund nets to zero
 */
export function validateRefundNetsToZero(
    saleSnapshots: LineItemSnapshot[],
    refundSnapshots: LineItemSnapshot[]
): boolean {
    const saleTotal = saleSnapshots.reduce((sum, s) => sum + s.commissionAmount + s.tipAllocated, 0)
    const refundTotal = refundSnapshots.reduce((sum, s) => sum + s.commissionAmount + s.tipAllocated, 0)
    return Math.abs(saleTotal + refundTotal) < 0.01
}
