/**
 * Inventory Contract Tests
 *
 * Verifies inventory endpoint contracts:
 * - Auth enforcement
 * - Response shape for items, categories, departments
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

describe('Inventory Contract Tests', () => {
    describe('Inventory auth enforcement', () => {
        const inventoryRoutes = [
            '/api/inventory/items',
            '/api/inventory/categories',
            '/api/inventory/departments',
            '/api/inventory/products',
            '/api/inventory/suppliers',
            '/api/inventory/purchase-orders',
        ]

        for (const path of inventoryRoutes) {
            test(`GET ${path} requires auth (returns 401)`, async () => {
                const { status } = await apiFetch(path)
                expect([401, 403]).toContain(status)
            })
        }
    })

    describe('Inventory error response shape', () => {
        test('items list returns error object on 401', async () => {
            const { status, data } = await apiFetch('/api/inventory/items')
            expect([401, 403]).toContain(status)
            expect(data).toHaveProperty('error')
            expect(typeof data.error).toBe('string')
        })

        test('categories list returns error object on 401', async () => {
            const { status, data } = await apiFetch('/api/inventory/categories')
            expect([401, 403]).toContain(status)
            expect(data).toHaveProperty('error')
        })
    })

    describe('Inventory write endpoints require auth', () => {
        test('POST /api/inventory/items returns 401', async () => {
            const { status } = await apiFetch('/api/inventory/items', {
                method: 'POST',
                body: JSON.stringify({ name: 'Test Item', price: 9.99 }),
            })
            expect([401, 403]).toContain(status)
        })
    })
})
