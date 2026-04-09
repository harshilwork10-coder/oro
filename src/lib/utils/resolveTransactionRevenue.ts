/**
 * Resolve Transaction Revenue — Cash-Equivalent Pricing
 *
 * In a dual-pricing system, the card price includes a convenience markup.
 * For franchisor revenue reporting and royalty calculations, we use the
 * CASH-EQUIVALENT price (base price) to represent true business revenue.
 *
 * The card fee markup is a pass-through cost — it goes to the payment
 * processor, not to the franchisee's revenue. Inflating franchisor reports
 * with card fees would misrepresent actual business performance.
 *
 * Rule:
 *   - Card transaction → use totalCash (the base price without card markup)
 *   - Cash transaction → use total (already the cash price)
 *   - Fallback → use total if totalCash is not set (pre-dual-pricing transactions)
 */

interface TransactionWithDualPricing {
    total: any; // Decimal from Prisma
    totalCash?: any | null;
    chargedMode?: string | null;
}

/**
 * Returns the cash-equivalent revenue for a single transaction.
 * Use this in all franchisor-level revenue calculations.
 */
export function resolveRevenue(tx: TransactionWithDualPricing): number {
    // If the transaction was charged on card AND has a cash total recorded,
    // use the cash total (the real base price without card fee markup)
    if (tx.chargedMode === 'CARD' && tx.totalCash != null) {
        return Number(tx.totalCash);
    }
    // Otherwise use the standard total (cash transactions or pre-dual-pricing)
    return Number(tx.total);
}

/**
 * Sum cash-equivalent revenue across an array of transactions.
 */
export function sumRevenue(transactions: TransactionWithDualPricing[]): number {
    return transactions.reduce((sum, tx) => sum + resolveRevenue(tx), 0);
}
