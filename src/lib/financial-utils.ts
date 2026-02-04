/**
 * Financial Utilities for Audit-Compliant Calculations
 * 
 * AUDIT STANDARD: These utilities ensure consistent decimal handling
 * across all financial reports to prevent penny rounding errors.
 */

/**
 * Rounds a currency value to 2 decimal places using banker's rounding.
 * This prevents accumulation of rounding errors in financial calculations.
 * 
 * @param value - The numeric value to round
 * @returns The value rounded to 2 decimal places
 */
export function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100
}

/**
 * Standardized transaction statuses for financial reports.
 * These are the only statuses that should be INCLUDED in sales totals.
 * 
 * COMPLETED: Normal successful transaction
 * APPROVED: Card payment approved but may be batched
 */
export const COMPLETED_STATUSES = ['COMPLETED', 'APPROVED'] as const

/**
 * Standardized transaction statuses for voided/refunded transactions.
 * These should be tracked separately and NOT included in gross sales.
 * 
 * VOIDED: Transaction cancelled before completion
 * REFUNDED: Money returned to customer
 * CANCELLED: Transaction cancelled by user
 */
export const VOIDED_STATUSES = ['VOIDED', 'REFUNDED', 'CANCELLED'] as const

/**
 * Formats a number as a currency string (USD).
 * Always shows 2 decimal places.
 * 
 * @param value - The numeric value to format
 * @returns Formatted currency string like "$1,234.56"
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(roundCurrency(value))
}

/**
 * Safely converts a Prisma Decimal or number to a rounded currency value.
 * Handles null/undefined gracefully.
 * 
 * @param value - The value to convert (can be Decimal, number, string, null)
 * @returns Rounded currency value, or 0 if input is invalid
 */
export function toRoundedCurrency(value: unknown): number {
    if (value === null || value === undefined) return 0
    const num = Number(value)
    if (isNaN(num)) return 0
    return roundCurrency(num)
}

/**
 * Sums an array of values and returns a rounded total.
 * Useful for aggregating transaction amounts.
 * 
 * @param values - Array of numeric values
 * @returns Rounded sum of all values
 */
export function sumAndRound(values: number[]): number {
    return roundCurrency(values.reduce((sum, val) => sum + val, 0))
}
