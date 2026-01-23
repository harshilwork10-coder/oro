/**
 * ORO 9 Reporting Definitions
 * 
 * NON-NEGOTIABLE: "Reporting must be auditable, reproducible, and immutable."
 * 
 * All report calculations MUST use these definitions.
 * No UI totals or cached totals as source of truth.
 */

// ═══════════════════════════════════════════════════════════════════════════
// METRIC DEFINITIONS (Code + UI consistency)
// ═══════════════════════════════════════════════════════════════════════════

export const METRIC_DEFINITIONS = {
    GROSS_SALES: {
        name: "Gross Sales",
        description: "Sum of completed sales before refunds/voids",
        calculation: "SUM(Transaction.total WHERE status = 'COMPLETED')",
        excludes: ["REFUNDED", "VOIDED", "PENDING"],
    },

    NET_SALES: {
        name: "Net Sales",
        description: "Gross Sales minus refunds",
        calculation: "GROSS_SALES - REFUNDS",
        note: "Voids are excluded from both (never completed)",
    },

    TAX_COLLECTED: {
        name: "Tax Collected",
        description: "Tax charged on sales minus tax refunded",
        calculation: "SUM(TaxLine.amount) - SUM(RefundTaxLine.amount)",
    },

    TIPS: {
        name: "Tips",
        description: "Gratuity amount (separate from sales)",
        calculation: "SUM(Tender.tipAmount WHERE type = 'TIP')",
        note: "Not included in Gross/Net Sales",
    },

    REFUNDS: {
        name: "Refunds",
        description: "Sum of refund amounts linked to original sales",
        calculation: "SUM(Refund.amount WHERE status = 'COMPLETED')",
        note: "Each refund linked to originalTransactionId",
    },

    VOIDS: {
        name: "Voids",
        description: "Full cancellation before settlement",
        calculation: "COUNT(Transaction WHERE status = 'VOIDED')",
        note: "Never included in sales totals (cancelled before completion)",
    },

    CASH_TENDERS: {
        name: "Cash Collected",
        description: "Cash payments received",
        calculation: "SUM(Tender.amount WHERE method = 'CASH')",
    },

    CARD_TENDERS: {
        name: "Card Collected",
        description: "Card payments received",
        calculation: "SUM(Tender.amount WHERE method IN ('CREDIT', 'DEBIT'))",
    },

    GIFT_TENDERS: {
        name: "Gift Cards",
        description: "Gift card redemptions",
        calculation: "SUM(Tender.amount WHERE method = 'GIFT_CARD')",
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// RECONCILIATION CHECKS
// ═══════════════════════════════════════════════════════════════════════════

export interface ReconciliationResult {
    passed: boolean;
    expected: number;
    actual: number;
    difference: number;
    tolerance: number;
}

/**
 * Z-Report reconciliation check
 * Cash + Card + Gift - Refunds + Paid-Outs = Expected Drawer
 */
export function checkZReportReconciliation(data: {
    cashTenders: number;
    cardTenders: number;
    giftTenders: number;
    refunds: number;
    paidOuts: number;
    expectedDrawer: number;
}): ReconciliationResult {
    const { cashTenders, cardTenders, giftTenders, refunds, paidOuts, expectedDrawer } = data;

    const calculated = cashTenders + cardTenders + giftTenders - refunds + paidOuts;
    const difference = Math.abs(calculated - expectedDrawer);
    const tolerance = 0.01; // 1 cent

    return {
        passed: difference <= tolerance,
        expected: expectedDrawer,
        actual: calculated,
        difference,
        tolerance,
    };
}

/**
 * Payment processor reconciliation check
 * POS card total must match processor batch total (within rounding)
 */
export function checkProcessorReconciliation(data: {
    posCardTotal: number;
    processorBatchTotal: number;
}): ReconciliationResult {
    const { posCardTotal, processorBatchTotal } = data;

    const difference = Math.abs(posCardTotal - processorBatchTotal);
    const tolerance = 0.01; // 1 cent rounding tolerance

    return {
        passed: difference <= tolerance,
        expected: processorBatchTotal,
        actual: posCardTotal,
        difference,
        tolerance,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// IMMUTABLE LEDGER RULES
// ═══════════════════════════════════════════════════════════════════════════

export const LEDGER_RULES = {
    // Sales can NEVER be deleted or edited after completion
    SALE_IMMUTABLE: "Sales cannot be deleted or edited after COMPLETED status",

    // Refunds are NEW records linked to original
    REFUND_AS_NEW_RECORD: "Refunds create new TransactionRefund record linked to originalTransactionId",

    // Voids are NEW records linked to original  
    VOID_AS_NEW_RECORD: "Voids create new TransactionVoid record linked to originalTransactionId",

    // Corrections via adjustment entries
    CORRECTION_AS_ADJUSTMENT: "Corrections must be adjustment entries, never overwrites",

    // Snapshot values on transaction
    SNAPSHOT_REQUIRED: [
        "price (at time of sale)",
        "taxRate (at time of sale)",
        "employeeId",
        "stationId",
        "locationId",
    ],
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════

export const AUDIT_REQUIRED_FIELDS = {
    REFUND: ["userId", "createdAt", "stationId", "reason", "approvedBy", "originalTransactionId"],
    VOID: ["userId", "createdAt", "stationId", "reason", "approvedBy", "originalTransactionId"],
    DISCOUNT_OVERRIDE: ["userId", "createdAt", "stationId", "reason", "approvedBy", "discountAmount"],
    PRICE_OVERRIDE: ["userId", "createdAt", "stationId", "reason", "approvedBy", "originalPrice", "newPrice"],
    DRAWER_OPEN: ["userId", "createdAt", "stationId", "reason"],
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT METADATA (Required on every export)
// ═══════════════════════════════════════════════════════════════════════════

export interface ExportMetadata {
    locationName: string;
    locationId: string;
    dateFrom: string;
    dateTo: string;
    generatedAt: string;
    generatedBy: string;
}

export function createExportMetadata(params: {
    locationName: string;
    locationId: string;
    dateFrom: string;
    dateTo: string;
    userId: string;
}): ExportMetadata {
    return {
        locationName: params.locationName,
        locationId: params.locationId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        generatedAt: new Date().toISOString(),
        generatedBy: params.userId,
    };
}
