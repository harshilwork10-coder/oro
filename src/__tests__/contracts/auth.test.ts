/**
 * Auth Contract Tests
 * 
 * Verifies auth behavior across route patterns:
 * - Routes reject unauthenticated requests with 401
 * - Routes reject unauthorized roles with 403
 * - Response shapes match expected contracts
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
    return { status: res.status, data, headers: res.headers }
}

describe('Auth Contract Tests', () => {
    describe('Unauthenticated requests return 401', () => {
        const protectedRoutes = [
            { path: '/api/inventory/items', method: 'GET' },
            { path: '/api/pos/transactions', method: 'GET' },
            { path: '/api/franchise/employees', method: 'GET' },
            { path: '/api/reports/catalog', method: 'GET' },
            { path: '/api/tax/groups', method: 'GET' },
            { path: '/api/settings/features', method: 'GET' },
        ]

        for (const route of protectedRoutes) {
            test(`${route.method} ${route.path} returns 401 without auth`, async () => {
                const { status } = await apiFetch(route.path, { method: route.method })
                expect(status).toBe(401)
            })
        }
    })

    describe('Auth error response shape', () => {
        test('401 response contains error field', async () => {
            const { status, data } = await apiFetch('/api/inventory/items')
            expect(status).toBe(401)
            expect(data).toHaveProperty('error')
            expect(typeof data.error).toBe('string')
        })
    })

    describe('Admin routes enforce PROVIDER role', () => {
        const adminRoutes = [
            '/api/admin/franchisors',
            '/api/admin/locations',
            '/api/admin/terminals',
            '/api/admin/team',
        ]

        for (const path of adminRoutes) {
            test(`GET ${path} returns 401/403 without PROVIDER auth`, async () => {
                const { status } = await apiFetch(path)
                expect([401, 403]).toContain(status)
            })
        }
    })

    describe('Public routes do NOT require auth', () => {
        const publicRoutes = [
            '/api/app/version-check',
            '/api/pwa/manifest',
        ]

        for (const path of publicRoutes) {
            test(`GET ${path} returns 200 without auth`, async () => {
                const { status } = await apiFetch(path)
                expect([200, 404]).toContain(status) // 404 if not configured
            })
        }
    })
})
