/**
 * Centralized Reason Codes for Auditable POS Actions
 * 
 * POLICY:
 * - Enforce structured codes going forward only
 * - Old free-text records preserved as legacy
 * - All sensitive actions require reasonCode + optional reasonNote
 * - API validation rejects unknown codes (except 'OTHER' which requires reasonNote)
 */

// ===================== REFUND =====================
export const REFUND_REASON_CODES = [
    { code: 'DEFECTIVE_PRODUCT', label: 'Defective Product' },
    { code: 'WRONG_ITEM', label: 'Wrong Item Sold' },
    { code: 'CUSTOMER_DISSATISFIED', label: 'Customer Dissatisfied' },
    { code: 'PRICE_DISPUTE', label: 'Price Dispute' },
    { code: 'DUPLICATE_CHARGE', label: 'Duplicate Charge' },
    { code: 'EXPIRED_PRODUCT', label: 'Expired Product' },
    { code: 'RECALL', label: 'Product Recall' },
    { code: 'MANAGER_APPROVED', label: 'Manager Approved' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

// ===================== VOID =====================
export const VOID_REASON_CODES = [
    { code: 'CUSTOMER_CHANGED_MIND', label: 'Customer Changed Mind' },
    { code: 'WRONG_ITEM_SCANNED', label: 'Wrong Item Scanned' },
    { code: 'PRICE_ERROR', label: 'Price Error' },
    { code: 'PAYMENT_FAILED', label: 'Payment Failed' },
    { code: 'TRAINING_TRANSACTION', label: 'Training Transaction' },
    { code: 'DUPLICATE_TRANSACTION', label: 'Duplicate Transaction' },
    { code: 'SYSTEM_ERROR', label: 'System Error' },
    { code: 'MANAGER_APPROVED', label: 'Manager Approved' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

// ===================== NO-SALE =====================
export const NO_SALE_REASON_CODES = [
    { code: 'MAKE_CHANGE', label: 'Make Change' },
    { code: 'VERIFY_CASH', label: 'Verify Cash Count' },
    { code: 'ERROR_CORRECTION', label: 'Error Correction' },
    { code: 'GIVE_RECEIPT', label: 'Give Receipt' },
    { code: 'CASH_DROP', label: 'Cash Drop' },
    { code: 'MANAGER_REQUEST', label: 'Manager Request' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

// ===================== PAID IN / OUT =====================
export const PAID_IN_REASON_CODES = [
    { code: 'VENDOR_PAYMENT_RECEIVED', label: 'Vendor Payment Received' },
    { code: 'CUSTOMER_TIP', label: 'Customer Tip' },
    { code: 'RETURNED_CHANGE', label: 'Returned Change' },
    { code: 'STARTING_CASH_ADJUSTMENT', label: 'Starting Cash Adjustment' },
    { code: 'MISCELLANEOUS_IN', label: 'Miscellaneous In' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

export const PAID_OUT_REASON_CODES = [
    { code: 'VENDOR_PAYMENT', label: 'Vendor Payment' },
    { code: 'STORE_SUPPLY_RUN', label: 'Store Supply Run' },
    { code: 'EMPLOYEE_ADVANCE', label: 'Employee Advance' },
    { code: 'PETTY_CASH', label: 'Petty Cash' },
    { code: 'TIP_PAYOUT', label: 'Tip Payout' },
    { code: 'MISCELLANEOUS_OUT', label: 'Miscellaneous Out' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

// ===================== INVENTORY ADJUSTMENT =====================
export const ADJUSTMENT_REASON_CODES = [
    { code: 'PHYSICAL_COUNT', label: 'Physical Count Correction' },
    { code: 'DAMAGE', label: 'Damaged Goods' },
    { code: 'EXPIRED', label: 'Expired' },
    { code: 'THEFT', label: 'Theft / Shrinkage' },
    { code: 'WASTE', label: 'Waste / Spoilage' },
    { code: 'VENDOR_RETURN', label: 'Vendor Return' },
    { code: 'RECEIVING_ERROR', label: 'Receiving Error' },
    { code: 'TRANSFER', label: 'Transfer Adjustment' },
    { code: 'CASE_BREAK', label: 'Case Break' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

// ===================== SHIFT REOPEN =====================
export const SHIFT_REOPEN_REASON_CODES = [
    { code: 'ACCIDENTAL_CLOSE', label: 'Accidental Close' },
    { code: 'MISSED_TRANSACTION', label: 'Missed Transaction' },
    { code: 'CASH_COUNT_ERROR', label: 'Cash Count Error' },
    { code: 'MANAGER_REQUEST', label: 'Manager Request' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

// ===================== DISCREPANCY APPROVAL =====================
export const DISCREPANCY_REASON_CODES = [
    { code: 'COUNTING_ERROR', label: 'Counting Error' },
    { code: 'MISSING_CASH_DROP', label: 'Missing Cash Drop' },
    { code: 'UNREPORTED_PAID_OUT', label: 'Unreported Paid Out' },
    { code: 'THEFT_SUSPECTED', label: 'Theft Suspected' },
    { code: 'CHANGE_MAKING_ERROR', label: 'Change Making Error' },
    { code: 'SYSTEM_ROUNDING', label: 'System Rounding' },
    { code: 'ACCEPTED_AS_IS', label: 'Accepted As-Is' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

// ===================== PRICE OVERRIDE =====================
export const PRICE_OVERRIDE_REASON_CODES = [
    { code: 'PRICE_MATCH', label: 'Price Match' },
    { code: 'DAMAGED_ITEM', label: 'Damaged Item Discount' },
    { code: 'LOYALTY_CUSTOMER', label: 'Loyalty Customer' },
    { code: 'MANAGER_DISCRETION', label: 'Manager Discretion' },
    { code: 'CLEARANCE', label: 'Clearance' },
    { code: 'COMPETITOR_PRICE', label: 'Competitor Price' },
    { code: 'OTHER', label: 'Other (specify)' },
] as const

// ===================== VALIDATION UTILITY =====================

type ReasonCodeList = readonly { readonly code: string; readonly label: string }[]

/**
 * Validate a reason code against a specific list.
 * Returns { valid: true } or { valid: false, error: string }
 * 
 * Rules:
 * - reasonCode is required
 * - Must be in the allowed list
 * - 'OTHER' requires reasonNote to be non-empty
 */
export function validateReasonCode(
    reasonCode: string | undefined | null,
    reasonNote: string | undefined | null,
    allowedCodes: ReasonCodeList
): { valid: true } | { valid: false; error: string } {
    if (!reasonCode) {
        return { valid: false, error: 'Reason code is required' }
    }

    const allowed = allowedCodes.map(c => c.code)
    if (!allowed.includes(reasonCode)) {
        return { valid: false, error: `Invalid reason code: ${reasonCode}. Allowed: ${allowed.join(', ')}` }
    }

    if (reasonCode === 'OTHER' && (!reasonNote || !reasonNote.trim())) {
        return { valid: false, error: 'Reason note is required when reason code is OTHER' }
    }

    return { valid: true }
}

/**
 * Get the label for a reason code
 */
export function getReasonLabel(code: string, codeList: ReasonCodeList): string {
    return codeList.find(c => c.code === code)?.label || code
}
