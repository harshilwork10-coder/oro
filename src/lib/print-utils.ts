/**
 * Print Utilities - Shared DTO Normalizer
 * Single source of truth for transforming transaction data into print format
 * Used by both immediate print (after checkout) and reprint (from history)
 */

import { ReceiptData } from './print-agent';

/**
 * Settings for print normalization
 */
export interface PrintSettings {
    showDualPricing: boolean;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
}

/**
 * Transaction from database (returned by API)
 * All fields should be non-null after Phase 1 & 2 fixes
 */
export interface TransactionForPrint {
    id: string;
    invoiceNumber?: string;
    createdAt: string | Date;
    subtotal: string | number;
    tax: string | number;
    total: string | number;
    // Dual pricing (NEVER null after Phase 1 fix)
    subtotalCash?: string | number | null;
    subtotalCard?: string | number | null;
    totalCash?: string | number | null;
    totalCard?: string | number | null;
    chargedMode?: string | null;
    paymentMethod: string;
    cardLast4?: string | null;
    change?: string | number | null;
    tip?: string | number | null;
    lineItems: Array<{
        id?: string;
        type?: string;
        quantity?: number | string;
        price?: string | number;
        total?: string | number;
        // Name snapshots (preferred)
        serviceNameSnapshot?: string | null;
        productNameSnapshot?: string | null;
        // Fallback: included service/product relations (for backwards compatibility)
        service?: { name?: string } | null;
        product?: { name?: string } | null;
        name?: string; // Direct name field
        priceCharged?: string | number | null;
        // Dual pricing
        cashUnitPrice?: string | number | null;
        cardUnitPrice?: string | number | null;
        cashLineTotal?: string | number | null;
        cardLineTotal?: string | number | null;
    }>;
    client?: {
        firstName?: string;
        lastName?: string;
    } | null;
    employee?: {
        name?: string;
    } | null;
}

/**
 * Validation result for print DTO
 */
export interface PrintValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * === TYPE GUARD: Validate transaction before printing ===
 * Fails fast with clear error messages if validation fails.
 * This prevents "works in dev, fails in store" scenarios.
 */
export function validateTransactionForPrint(
    transaction: unknown,
    settings: PrintSettings
): PrintValidationResult {
    const errors: string[] = [];

    if (!transaction || typeof transaction !== 'object') {
        return { valid: false, errors: ['[PRINT] DTO_INVALID: Transaction is null or not an object'] };
    }

    const tx = transaction as TransactionForPrint;

    // Required fields
    if (!tx.id) {
        errors.push('[PRINT] DTO_INVALID: Missing transaction ID');
    }

    if (!tx.lineItems || !Array.isArray(tx.lineItems) || tx.lineItems.length === 0) {
        errors.push('[PRINT] DTO_INVALID: Transaction has no line items');
    }

    // Validate each line item has a display name
    // Allow fallback to service/product.name or direct name field for backwards compatibility
    if (tx.lineItems) {
        tx.lineItems.forEach((item, index) => {
            const displayName =
                item.serviceNameSnapshot ||
                item.productNameSnapshot ||
                item.service?.name ||
                item.product?.name ||
                item.name;
            if (!displayName) {
                errors.push(`[PRINT] DTO_INVALID: Line item ${index} has no display name`);
            }
        });
    }

    // Validate totals are present as numbers
    const total = Number(tx.total);
    if (isNaN(total) || total < 0) {
        errors.push('[PRINT] DTO_INVALID: Transaction total is invalid or missing');
    }

    // If dual pricing enabled, validate cash/card totals
    if (settings.showDualPricing) {
        const cashTotal = tx.totalCash !== null && tx.totalCash !== undefined ? Number(tx.totalCash) : null;
        const cardTotal = tx.totalCard !== null && tx.totalCard !== undefined ? Number(tx.totalCard) : null;

        if (cashTotal === null || isNaN(cashTotal)) {
            errors.push('[PRINT] DTO_INVALID: Dual pricing enabled but totalCash is missing/invalid');
        }
        if (cardTotal === null || isNaN(cardTotal)) {
            errors.push('[PRINT] DTO_INVALID: Dual pricing enabled but totalCard is missing/invalid');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Normalize transaction data for printing
 * SINGLE SOURCE OF TRUTH - used by both immediate print and reprint
 * 
 * @param transaction - Transaction data from database
 * @param settings - Print settings including dual pricing flag
 * @param cashierName - Name of cashier (from session)
 * @returns ReceiptData ready for print agent
 * @throws Error if transaction fails validation
 */
export function normalizeTransactionForPrint(
    transaction: TransactionForPrint,
    settings: PrintSettings,
    cashierName?: string
): ReceiptData {
    // === VALIDATION GUARDRAIL: Fail fast if transaction is invalid ===
    const validation = validateTransactionForPrint(transaction, settings);
    if (!validation.valid) {
        // Log all validation errors
        validation.errors.forEach(err => console.error(err));
        throw new Error(`Print validation failed: ${validation.errors[0]}`);
    }

    // Map line items - extract display name from snapshots or fallbacks
    const items = transaction.lineItems.map(item => {
        // === DISPLAY NAME: Priority order ===
        // 1. serviceNameSnapshot (for services)
        // 2. productNameSnapshot (for products)
        // 3. service.name (backwards compat)
        // 4. product.name (backwards compat)
        // 5. name field (direct)
        const displayName =
            item.serviceNameSnapshot ||
            item.productNameSnapshot ||
            item.service?.name ||
            item.product?.name ||
            item.name ||
            `Unknown ${item.type || 'Item'}`;  // Fail-safe only

        const quantity = Number(item.quantity || 1);
        const price = Number(item.priceCharged || item.price || 0);
        const total = Number(item.total || item.cashLineTotal || (price * quantity));

        return {
            name: displayName,
            quantity,
            price,
            total,
            // Dual pricing per line item
            cashPrice: item.cashUnitPrice ? Number(item.cashUnitPrice) : undefined,
            cardPrice: item.cardUnitPrice ? Number(item.cardUnitPrice) : undefined
        };
    });

    // Calculate totals
    const subtotal = Number(transaction.subtotal || 0);
    const tax = Number(transaction.tax || 0);
    const total = Number(transaction.total || 0);

    // Dual pricing totals (should NEVER be null after Phase 1 fix - validation enforces this)
    const cashTotal = transaction.totalCash !== null && transaction.totalCash !== undefined
        ? Number(transaction.totalCash)
        : total;
    const cardTotal = transaction.totalCard !== null && transaction.totalCard !== undefined
        ? Number(transaction.totalCard)
        : total;

    // Determine charged mode
    const chargedMode = (transaction.chargedMode as 'CASH' | 'CARD') ||
        (transaction.paymentMethod === 'CASH' ? 'CASH' : 'CARD');

    return {
        storeName: settings.storeName || 'Store',
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        transactionId: transaction.id,
        invoiceNumber: transaction.invoiceNumber,
        date: new Date(transaction.createdAt).toLocaleString(),
        cashier: cashierName || 'Staff',
        items,
        subtotal,
        tax,
        total,
        // Dual pricing
        cashTotal,
        cardTotal,
        chargedMode,
        showDualPricing: settings.showDualPricing && cashTotal !== cardTotal,
        // Payment info
        paymentMethod: transaction.paymentMethod,
        change: transaction.change ? Number(transaction.change) : undefined,
        cardLast4: transaction.cardLast4 || undefined,
        barcode: transaction.invoiceNumber || transaction.id,
        openDrawer: transaction.paymentMethod === 'CASH'
    };
}

