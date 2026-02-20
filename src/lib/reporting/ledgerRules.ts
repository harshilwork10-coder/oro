/**
 * ORO 9 Salon Reporting - Immutable Ledger Rules
 * 
 * Financial data integrity rules:
 * - SALE rows are append-only after capture
 * - REFUND is a new record linked to originalSaleId
 * - VOID is a separate event linked to original attempt
 * - NO hard delete on financial data
 * 
 * @version 1.0.0
 */

/**
 * Transaction types in the immutable ledger
 */
export enum TransactionType {
    SALE = 'SALE',
    REFUND = 'REFUND',
    VOID = 'VOID',
    ADJUSTMENT = 'ADJUSTMENT'
}

/**
 * Fields that can NEVER be modified after transaction creation
 */
export const IMMUTABLE_FIELDS = [
    'id',
    'type',
    'total',
    'subtotal',
    'tax',
    'tipAmount',
    'paymentMethod',
    'tenderAmount',
    'createdAt',
    'employeeId',
    'customerId',
    'locationId',
    'originalTransactionId' // For refunds/voids
] as const;

/**
 * Fields that CAN be modified (non-financial metadata)
 */
export const MUTABLE_FIELDS = [
    'notes',
    'tags',
    'customerNotes',
    'internalNotes',
    'updatedAt'
] as const;

/**
 * Validate that a transaction modification is allowed
 */
export function validateTransactionModification(
    originalData: Record<string, unknown>,
    newData: Record<string, unknown>
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of IMMUTABLE_FIELDS) {
        if (field in newData && originalData[field] !== newData[field]) {
            errors.push(`Cannot modify immutable field: ${field}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Create a refund transaction linked to original sale
 */
export interface RefundInput {
    originalTransactionId: string;
    amount: number;
    reason: string;
    approvedBy: string;
    items?: Array<{
        originalLineItemId: string;
        quantity: number;
        amount: number;
    }>;
}

export function createRefundRecord(input: RefundInput) {
    return {
        type: TransactionType.REFUND,
        originalTransactionId: input.originalTransactionId,
        total: -Math.abs(input.amount), // Always negative
        reason: input.reason,
        approvedBy: input.approvedBy,
        items: input.items,
        createdAt: new Date()
    };
}

/**
 * Create a void event linked to original transaction
 */
export interface VoidInput {
    originalTransactionId: string;
    reason: string;
    approvedBy: string;
}

export function createVoidRecord(input: VoidInput) {
    return {
        type: TransactionType.VOID,
        originalTransactionId: input.originalTransactionId,
        reason: input.reason,
        approvedBy: input.approvedBy,
        createdAt: new Date()
    };
}

/**
 * Reconciliation formulas
 */
export interface ReconciliationResult {
    grossSales: number;
    refunds: number;
    voids: number;
    discounts: number;
    netSales: number;
    tips: { cash: number; card: number; total: number };
    tenders: {
        cash: number;
        card: number;
        giftCard: number;
        other: number;
        total: number
    };
    variance: number;
    reconciled: boolean;
    warnings: Array<{ type: string; message: string; amount: number }>;
}

/**
 * Calculate reconciliation for a set of transactions
 */
export function calculateReconciliation(transactions: Array<{
    type: string;
    total: number;
    tipAmount?: number;
    tipType?: 'CASH' | 'CARD';
    paymentMethod: string;
    status: string;
}>): ReconciliationResult {
    let grossSales = 0;
    let refunds = 0;
    let voids = 0;
    const discounts = 0;
    let tipsCash = 0;
    let tipsCard = 0;
    const tenders = { cash: 0, card: 0, giftCard: 0, other: 0, total: 0 };
    const warnings: Array<{ type: string; message: string; amount: number }> = [];

    for (const tx of transactions) {
        switch (tx.type) {
            case 'SALE':
                if (tx.status !== 'VOIDED') {
                    grossSales += tx.total;
                    // Count tenders
                    if (tx.paymentMethod === 'CASH') tenders.cash += tx.total;
                    else if (['CREDIT_CARD', 'DEBIT_CARD', 'CARD'].includes(tx.paymentMethod)) tenders.card += tx.total;
                    else if (tx.paymentMethod === 'GIFT_CARD') tenders.giftCard += tx.total;
                    else tenders.other += tx.total;
                }
                break;
            case 'REFUND':
                refunds += Math.abs(tx.total);
                break;
            case 'VOID':
                voids += Math.abs(tx.total);
                break;
        }

        // Tips
        if (tx.tipAmount) {
            if (tx.tipType === 'CASH') tipsCash += tx.tipAmount;
            else tipsCard += tx.tipAmount;
        }
    }

    tenders.total = tenders.cash + tenders.card + tenders.giftCard + tenders.other;
    const netSales = grossSales - refunds - voids - discounts;
    const expectedTenderTotal = netSales + tipsCash + tipsCard;
    const variance = Math.abs(tenders.total - expectedTenderTotal);
    const reconciled = variance < 0.01; // Allow penny rounding

    if (!reconciled) {
        warnings.push({
            type: 'TENDER_MISMATCH',
            message: `Tender total ($${tenders.total.toFixed(2)}) doesn't match expected ($${expectedTenderTotal.toFixed(2)})`,
            amount: variance
        });
    }

    return {
        grossSales,
        refunds,
        voids,
        discounts,
        netSales,
        tips: { cash: tipsCash, card: tipsCard, total: tipsCash + tipsCard },
        tenders,
        variance,
        reconciled,
        warnings
    };
}
