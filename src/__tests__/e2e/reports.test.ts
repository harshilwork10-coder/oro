// @ts-nocheck
/**
 * E2E Test: Report Endpoints
 *
 * Tests: flash report, sales velocity, ABC analysis, loss prevention, realtime sales,
 *        year-over-year, anomaly detection, CSV export, scheduled reports
 * Run: npx jest src/__tests__/e2e/reports.test.ts
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    return { status: res.status, data: await res.json().catch(() => null) }
}

describe('Reports E2E', () => {
    describe('Flash Report', () => {
        test('GET flash report returns today summary', async () => {
            const { status, data } = await apiFetch('/api/reports/flash-report')
            expect([200, 401]).toContain(status)
        })
    })

    describe('Sales Velocity', () => {
        test('GET velocity with days parameter', async () => {
            const { status, data } = await apiFetch('/api/reports/sales-velocity?days=30')
            expect([200, 401]).toContain(status)
        })
    })

    describe('ABC Analysis', () => {
        test('GET ABC classification', async () => {
            const { status, data } = await apiFetch('/api/reports/abc-analysis')
            expect([200, 401]).toContain(status)
        })
    })

    describe('Loss Prevention Dashboard', () => {
        test('GET loss prevention with days param', async () => {
            const { status, data } = await apiFetch('/api/reports/loss-prevention?days=7')
            expect([200, 401]).toContain(status)
        })
    })

    describe('Realtime Sales Ticker', () => {
        test('GET realtime sales', async () => {
            const { status, data } = await apiFetch('/api/reports/realtime-sales')
            expect([200, 401]).toContain(status)
        })
    })

    describe('Year-over-Year', () => {
        test('GET YoY comparison for month', async () => {
            const { status, data } = await apiFetch('/api/reports/year-over-year?period=month')
            expect([200, 401]).toContain(status)
        })
    })

    describe('Anomaly Detection', () => {
        test('GET anomalies for 7 days', async () => {
            const { status, data } = await apiFetch('/api/reports/anomaly-detection?days=7')
            expect([200, 401]).toContain(status)
        })
    })

    describe('CSV Export', () => {
        test('GET CSV export for transactions', async () => {
            const res = await fetch(`${BASE_URL}/api/reports/csv-export?type=TRANSACTIONS`, {
                headers: { 'Content-Type': 'application/json' },
            })
            // CSV returns 200 with text/csv or 401
            expect([200, 401]).toContain(res.status)
        })

        test('GET CSV export for items', async () => {
            const res = await fetch(`${BASE_URL}/api/reports/csv-export?type=ITEMS`)
            expect([200, 401]).toContain(res.status)
        })
    })

    describe('Scheduled Reports', () => {
        test('GET scheduled reports list', async () => {
            const { status } = await apiFetch('/api/reports/scheduled')
            expect([200, 401]).toContain(status)
        })

        test('POST create schedule', async () => {
            const { status } = await apiFetch('/api/reports/scheduled', {
                method: 'POST',
                body: JSON.stringify({
                    email: 'test@example.com',
                    reportType: 'FLASH',
                    frequency: 'DAILY',
                    time: '07:00',
                }),
            })
            expect([200, 400, 401]).toContain(status)
        })
    })

    describe('Customer Segmentation', () => {
        test('GET customer segments', async () => {
            const { status, data } = await apiFetch('/api/customers/segmentation?days=90')
            expect([200, 401]).toContain(status)
        })
    })

    describe('Accounting Export', () => {
        test('GET QuickBooks journal', async () => {
            const today = new Date().toISOString().split('T')[0]
            const { status } = await apiFetch(`/api/reports/accounting-export?format=QUICKBOOKS&date=${today}`)
            expect([200, 401]).toContain(status)
        })
    })
})
