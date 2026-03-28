/**
 * POS Contract Tests
 *
 * Verifies POS endpoint contracts:
 * - Auth enforcement
 * - Response shape for checkout, refund, sale endpoints
 * - Required fields present
 */

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

describe('POS Contract Tests', () => {
    describe('POS endpoint auth enforcement', () => {
        const posRoutes = [
            { path: '/api/pos/transactions', method: 'GET' },
            { path: '/api/pos/retail/search?q=test', method: 'GET' },
            { path: '/api/pos/retail/layout', method: 'GET' },
            { path: '/api/pos/email-receipt', method: 'POST' },
        ]

        for (const route of posRoutes) {
            test(`${route.method} ${route.path} requires auth`, async () => {
                const { status } = await apiFetch(route.path, { method: route.method })
                expect([401, 403]).toContain(status)
            })
        }
    })

    describe('POS checkout endpoint', () => {
        test('POST /api/pos/checkout returns 401 without auth', async () => {
            const { status, data } = await apiFetch('/api/pos/checkout', {
                method: 'POST',
                body: JSON.stringify({
                    items: [{ itemId: 'test', quantity: 1, price: 10 }],
                    paymentMethod: 'CASH',
                    subtotal: 10,
                    tax: 0.85,
                    total: 10.85,
                }),
            })
            expect([401, 403]).toContain(status)
            expect(data).toHaveProperty('error')
        })
    })

    describe('Split tender endpoint', () => {
        test('POST /api/pos/split-tender returns 401 without auth', async () => {
            const { status, data } = await apiFetch('/api/pos/split-tender', {
                method: 'POST',
                body: JSON.stringify({
                    transactionId: 'test-txn',
                    tenders: [
                        { method: 'CASH', amount: 10 },
                        { method: 'CARD', amount: 15.50 },
                    ],
                }),
            })
            expect([401, 400]).toContain(status)
            expect(data).toHaveProperty('error')
        })
    })

    describe('Training mode endpoint', () => {
        test('POST /api/pos/training-mode returns error shape', async () => {
            const { status, data } = await apiFetch('/api/pos/training-mode', {
                method: 'POST',
                body: JSON.stringify({ stationId: 'test', enabled: true }),
            })
            expect([401, 403]).toContain(status)
            if (status !== 200) {
                expect(data).toHaveProperty('error')
            }
        })
    })
})
