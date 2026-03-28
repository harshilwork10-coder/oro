/**
 * Tax CRUD Contract Tests
 *
 * Verifies tax management endpoint contracts:
 * - Auth enforcement
 * - Response shape for tax groups and department defaults
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

describe('Tax Contract Tests', () => {
    describe('Tax auth enforcement', () => {
        test('GET /api/tax/groups requires auth', async () => {
            const { status } = await apiFetch('/api/tax/groups')
            expect([401, 403]).toContain(status)
        })

        test('GET /api/tax/department-defaults requires auth', async () => {
            const { status } = await apiFetch('/api/tax/department-defaults')
            expect([401, 403]).toContain(status)
        })
    })

    describe('Tax error response shape', () => {
        test('tax groups returns error object on 401', async () => {
            const { status, data } = await apiFetch('/api/tax/groups')
            expect([401, 403]).toContain(status)
            expect(data).toHaveProperty('error')
            expect(typeof data.error).toBe('string')
        })

        test('department defaults returns error object on 401', async () => {
            const { status, data } = await apiFetch('/api/tax/department-defaults')
            expect([401, 403]).toContain(status)
            expect(data).toHaveProperty('error')
        })
    })

    describe('Tax CRUD endpoints exist', () => {
        test('POST /api/tax/groups returns 401 without auth', async () => {
            const { status } = await apiFetch('/api/tax/groups', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'TEST_GROUP',
                    locationId: 'test-loc',
                    components: [],
                }),
            })
            expect([401, 403]).toContain(status)
        })
    })
})
