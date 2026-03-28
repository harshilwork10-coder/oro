/**
 * Reports Contract Tests
 *
 * Verifies report endpoint contracts:
 * - Auth enforcement on all report routes
 * - Response shape for report catalog
 * - PDF generation auth
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

describe('Reports Contract Tests', () => {
    describe('Report auth enforcement', () => {
        const reportRoutes = [
            '/api/reports/catalog',
            '/api/reports/pdf?reportId=flash-report',
            '/api/franchise/reports/cash-card',
            '/api/franchise/reports/payout-history',
            '/api/franchise/reports/discount-audit',
        ]

        for (const path of reportRoutes) {
            test(`GET ${path} returns 401 without auth`, async () => {
                const { status } = await apiFetch(path)
                expect([401, 403]).toContain(status)
            })
        }
    })

    describe('Report error response shape', () => {
        test('report catalog returns error object on 401', async () => {
            const { status, data } = await apiFetch('/api/reports/catalog')
            expect([401, 403]).toContain(status)
            expect(data).toHaveProperty('error')
            expect(typeof data.error).toBe('string')
        })
    })

    describe('Flash report endpoint', () => {
        test('GET /api/reports/flash-report requires auth', async () => {
            const { status } = await apiFetch('/api/reports/flash-report')
            expect([401, 403, 404]).toContain(status)
        })
    })
})
