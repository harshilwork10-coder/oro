/**
 * Safe Format Currency — Drop-in replacement for formatCurrency
 *
 * Handles: NaN, Infinity, null, undefined, Prisma Decimal, negative zero.
 * Always returns a valid dollar string like "$0.00".
 */

export function formatCurrencySafe(value: any): string {
    if (value === null || value === undefined) return '$0.00'

    const n = typeof value === 'string' ? parseFloat(value) : Number(value)

    if (!isFinite(n)) return '$0.00'

    // Prevent -0 display
    const safe = Object.is(n, -0) ? 0 : n

    // Use absolute value for formatting, add negative sign manually
    const abs = Math.abs(safe)
    const formatted = abs.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

    return safe < 0 ? `-${formatted}` : formatted
}

/**
 * Safe percentage format — "(45.2%)" style
 */
export function formatPercentSafe(value: any, decimals = 1): string {
    if (value === null || value === undefined) return '0%'
    const n = Number(value)
    if (!isFinite(n)) return '0%'
    return `${n.toFixed(decimals)}%`
}

/**
 * Safe number format with optional K/M suffix
 */
export function formatNumberSafe(value: any): string {
    if (value === null || value === undefined) return '0'
    const n = Number(value)
    if (!isFinite(n)) return '0'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toLocaleString()
}

export default formatCurrencySafe
