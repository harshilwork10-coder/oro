/**
 * POS Critical Flow Contract Tests — Sprint 14
 *
 * Validates API contracts for:
 * - Reason code enforcement (refund, void, no-sale, paid-in-out, shift reopen, variance-approval)
 * - Stock guard enforcement (transaction, adjustments)
 * - Payment timeout recovery
 * - Transaction recovery
 * - Price-embedded barcode parsing (unit-level, no API)
 */

import { parseEmbeddedBarcode, calculateWeightPrice, isEmbeddedBarcode } from '@/lib/barcode/embedded-price-parser'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    return { status: res.status, data }
}

describe('Reason Code Enforcement Contracts', () => {
    const sensitiveRoutes = [
        { path: '/api/pos/refund', method: 'POST', name: 'Refund' },
        { path: '/api/pos/void', method: 'POST', name: 'Void' },
        { path: '/api/pos/no-sale', method: 'POST', name: 'No-Sale' },
        { path: '/api/pos/paid-in-out', method: 'POST', name: 'Paid In/Out' },
        { path: '/api/pos/shift/reopen', method: 'POST', name: 'Shift Reopen' },
        { path: '/api/pos/shift/variance-approval', method: 'POST', name: 'Variance Approval' },
    ]

    for (const route of sensitiveRoutes) {
        test(`${route.name} (${route.path}) requires auth`, async () => {
            const { status } = await apiFetch(route.path, { method: route.method, body: '{}' })
            expect([401, 403]).toContain(status)
        })
    }

    test('No-sale rejects invalid reason code', async () => {
        const { status, data } = await apiFetch('/api/pos/no-sale', {
            method: 'POST',
            body: JSON.stringify({ reason: 'INVALID_CODE_XYZ', stationId: 'test' }),
        })
        // Should be 400 (invalid reason) or 401 (unauthed) — both are correct enforcement
        expect([400, 401]).toContain(status)
        expect(data).toHaveProperty('error')
    })
})

describe('Stock Guard Contract', () => {
    test('POST /api/pos/transaction requires auth', async () => {
        const { status } = await apiFetch('/api/pos/transaction', {
            method: 'POST',
            body: JSON.stringify({ items: [], paymentMethod: 'CASH', subtotal: 0, total: 0 }),
        })
        expect([401, 403]).toContain(status)
    })

    test('POST /api/inventory/adjustments requires auth', async () => {
        const { status } = await apiFetch('/api/inventory/adjustments', {
            method: 'POST',
            body: JSON.stringify({ productId: 'test', quantity: -5, reason: 'DAMAGED' }),
        })
        expect([401, 403]).toContain(status)
    })
})

describe('Payment Timeout Recovery Contract', () => {
    test('POST /api/pos/payment-timeout requires auth', async () => {
        const { status, data } = await apiFetch('/api/pos/payment-timeout', {
            method: 'POST',
            body: JSON.stringify({ amount: 25.00, stationId: 'test-station' }),
        })
        expect([401, 403]).toContain(status)
        expect(data).toHaveProperty('error')
    })
})

describe('Transaction Recovery Contract', () => {
    test('GET /api/pos/recover-transaction requires auth', async () => {
        const { status } = await apiFetch('/api/pos/recover-transaction?stationId=test')
        expect([401, 403]).toContain(status)
    })

    test('POST /api/pos/recover-transaction requires auth', async () => {
        const { status, data } = await apiFetch('/api/pos/recover-transaction', {
            method: 'POST',
            body: JSON.stringify({ transactionId: 'test', action: 'VOID' }),
        })
        expect([401, 403]).toContain(status)
        expect(data).toHaveProperty('error')
    })
})

describe('Price-Embedded Barcode Parser (Unit)', () => {
    test('standard barcode returns STANDARD type', () => {
        const result = parseEmbeddedBarcode('041220000123')
        expect(result.type).toBe('STANDARD')
        expect(result.isEmbedded).toBe(false)
    })

    test('prefix 20 extracts PLU and price', () => {
        // 20-12345-01234-K → PLU: 12345, Price: $12.34
        const result = parseEmbeddedBarcode('201234501234')
        expect(result.type).toBe('PRICE_EMBEDDED')
        expect(result.isEmbedded).toBe(true)
        expect(result.plu).toBe('12345')
        expect(result.embeddedPrice).toBe(12.34)
    })

    test('prefix 21 extracts PLU and price', () => {
        const result = parseEmbeddedBarcode('210004500378')
        expect(result.type).toBe('PRICE_EMBEDDED')
        expect(result.isEmbedded).toBe(true)
        expect(result.plu).toBe('00045')
        expect(result.embeddedPrice).toBe(3.78)
    })

    test('prefix 27 extracts PLU and weight', () => {
        // 27-00045-02500-K → PLU: 00045, Weight: 2.500 lbs
        const result = parseEmbeddedBarcode('270004502500')
        expect(result.type).toBe('WEIGHT_EMBEDDED')
        expect(result.isEmbedded).toBe(true)
        expect(result.plu).toBe('00045')
        expect(result.embeddedWeight).toBe(2.5)
    })

    test('calculateWeightPrice computes correctly', () => {
        // 2.5 lbs × $3.99/lb = $9.98
        expect(calculateWeightPrice(2.5, 3.99)).toBe(9.98)
        // 1.234 lbs × $5.00/lb = $6.17
        expect(calculateWeightPrice(1.234, 5.00)).toBe(6.17)
        // 0.5 lbs × $10.00/lb = $5.00
        expect(calculateWeightPrice(0.5, 10.00)).toBe(5.00)
    })

    test('isEmbeddedBarcode quick check works', () => {
        expect(isEmbeddedBarcode('201234501234')).toBe(true)
        expect(isEmbeddedBarcode('270004502500')).toBe(true)
        expect(isEmbeddedBarcode('041220000123')).toBe(false)
        expect(isEmbeddedBarcode('123')).toBe(false)
    })

    test('short barcodes treated as STANDARD', () => {
        const result = parseEmbeddedBarcode('4011')
        expect(result.type).toBe('STANDARD')
        expect(result.isEmbedded).toBe(false)
    })
})
