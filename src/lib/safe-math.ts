/**
 * Safe Math Utilities — Bulletproof financial calculations
 *
 * Every POS math operation should use these functions.
 * Handles: NaN, Infinity, undefined, null, Prisma Decimal, division-by-zero.
 */

/**
 * Safe number conversion — handles Prisma Decimal, null, undefined, NaN
 * Always returns a finite number (0 as fallback)
 */
export function safeNumber(value: unknown, fallback = 0): number {
    if (value === null || value === undefined) return fallback
    const n = typeof value === 'string' ? parseFloat(value) : Number(value)
    return isFinite(n) ? n : fallback
}

/**
 * Safe division — prevents division by zero and NaN results
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
    if (!denominator || !isFinite(denominator)) return fallback
    const result = numerator / denominator
    return isFinite(result) ? result : fallback
}

/**
 * Safe money rounding — always 2 decimal places, prevents floating point artifacts
 * e.g., 0.1 + 0.2 = 0.30000000000000004 → safeMoney gives 0.30
 */
export function safeMoney(value: unknown): number {
    const n = safeNumber(value)
    return Math.round(n * 100) / 100
}

/**
 * Safe percentage — (part / total) * 100, guarded against division by zero
 */
export function safePercent(part: number, total: number, decimals = 1): number {
    const result = safeDivide(part, total, 0) * 100
    const factor = Math.pow(10, decimals)
    return Math.round(result * factor) / factor
}

/**
 * Safe array — ensures a value is always an array (prevents .map() crashes)
 */
export function safeArray<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : []
}

/**
 * Safe sum — sums a numeric field from an array with type coercion
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeSum(items: any[], field: string): number {
    return safeArray(items).reduce((sum, item) => sum + safeNumber(item?.[field]), 0)
}

/**
 * Safe average — average of a numeric field, guarded against empty arrays
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeAverage(items: any[], field: string): number {
    const arr = safeArray(items)
    if (arr.length === 0) return 0
    return safeDivide(safeSum(arr, field), arr.length)
}

/**
 * Safe format — toFixed() that never returns "NaN" or "Infinity"
 */
export function safeFixed(value: unknown, decimals = 2): string {
    const n = safeNumber(value)
    return n.toFixed(decimals)
}

/**
 * Clamp — keep a value within min/max bounds
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(safeNumber(value), min), max)
}

const safeMath = {
    safeNumber, safeDivide, safeMoney, safePercent,
    safeArray, safeSum, safeAverage, safeFixed, clamp,
}
export default safeMath
