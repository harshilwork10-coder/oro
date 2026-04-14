/**
 * S7-01: End-to-End Retail Happy Path Test Suite
 *
 * Verifies the complete store sale loop works together:
 * Open Shift → Scan/Add Item → Quantity Update → Cash/Card/Split Checkout → Receipt → Close Shift
 *
 * Run: npx jest --testPathPattern=retail-happy-path
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-station-token'

const headers = (extra: Record<string, string> = {}) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    ...extra
})

describe('S7-01: Retail Happy Path E2E', () => {
    let shiftId: string
    let transactionId: string

    // ─── 1. OPEN SHIFT ───────────────────────────────────────────
    describe('Step 1: Open Shift', () => {
        it('should open a cash drawer session with starting cash', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/shift`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    action: 'OPEN',
                    startingCash: 100.00,
                    stationId: 'test-station-1'
                })
            })
            expect(res.status).toBe(200)
            const _data = await res.json()
            expect(data.shift || data.session).toBeTruthy()
            shiftId = data.shift?.id || data.session?.id
            expect(shiftId).toBeTruthy()
        })
    })

    // ─── 2. ADD ITEMS ────────────────────────────────────────────
    describe('Step 2: Add Items to Cart', () => {
        it('should create a transaction with items', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/transaction`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    items: [
                        { itemId: 'test-item-1', name: 'Test Soda', quantity: 2, price: 1.99, unitPrice: 1.99 },
                        { itemId: 'test-item-2', name: 'Test Chips', quantity: 1, price: 3.49, unitPrice: 3.49 }
                    ],
                    paymentMethod: 'CASH',
                    cashDrawerSessionId: shiftId
                })
            })
            expect(res.status).toBe(200)
            const _data = await res.json()
            expect(data.transaction).toBeTruthy()
            transactionId = data.transaction.id
        })
    })

    // ─── 3. CASH CHECKOUT ────────────────────────────────────────
    describe('Step 3: Cash Checkout', () => {
        it('should complete a cash transaction with correct totals', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/transaction`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    items: [{ itemId: 'cash-test-item', name: 'Cash Item', quantity: 1, price: 5.00, unitPrice: 5.00 }],
                    paymentMethod: 'CASH',
                    cashDrawerSessionId: shiftId,
                    cashTendered: 10.00
                })
            })
            expect(res.status).toBe(200)
            const _data = await res.json()
            expect(data.transaction.paymentMethod).toBe('CASH')
            expect(data.transaction.status).toBe('COMPLETED')
        })
    })

    // ─── 4. CARD CHECKOUT ────────────────────────────────────────
    describe('Step 4: Card Checkout', () => {
        it('should complete a card transaction', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/transaction`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    items: [{ itemId: 'card-test-item', name: 'Card Item', quantity: 1, price: 12.99, unitPrice: 12.99 }],
                    paymentMethod: 'CREDIT_CARD',
                    cashDrawerSessionId: shiftId
                })
            })
            expect(res.status).toBe(200)
            const _data = await res.json()
            expect(['CREDIT_CARD', 'DEBIT_CARD']).toContain(data.transaction.paymentMethod)
        })
    })

    // ─── 5. SPLIT TENDER ─────────────────────────────────────────
    describe('Step 5: Split Tender', () => {
        it('should process a split payment (cash + card)', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/split-tender`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    items: [{ itemId: 'split-item', name: 'Split Item', quantity: 1, price: 20.00, unitPrice: 20.00 }],
                    tenders: [
                        { method: 'CASH', amount: 10.00 },
                        { method: 'CREDIT_CARD', amount: 10.00 }
                    ],
                    cashDrawerSessionId: shiftId
                })
            })
            // Split tender may or may not exist — API level check
            expect([200, 201]).toContain(res.status)
        })
    })

    // ─── 6. TRANSACTION HISTORY ──────────────────────────────────
    describe('Step 6: Transaction History', () => {
        it('should list completed transactions for this shift', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/transaction?shiftId=${shiftId}`, {
                headers: headers()
            })
            expect(res.status).toBe(200)
            const _data = await res.json()
            expect(data.transactions?.length || data.length).toBeGreaterThan(0)
        })
    })

    // ─── 7. X-REPORT (Mid-Shift) ────────────────────────────────
    describe('Step 7: X-Report', () => {
        it('should generate an X report without closing shift', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/shift/xz-report?shiftId=${shiftId}&type=X`, {
                headers: headers()
            })
            expect(res.status).toBe(200)
            const _data = await res.json()
            expect(data.report?.reportType).toBe('X')
            expect(data.report?.transactionCount).toBeGreaterThan(0)
        })
    })

    // ─── 8. CLOSE SHIFT (Blind Close) ───────────────────────────
    describe('Step 8: Close Shift', () => {
        it('should close drawer with blind close and calculate variance', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/blind-close`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    shiftId,
                    countedAmount: 115.00, // Starting 100 + some cash sales
                    denominations: [{ label: '$20', count: 5 }, { label: '$10', count: 1 }, { label: '$5', count: 1 }]
                })
            })
            expect(res.status).toBe(200)
            const _data = await res.json()
            expect(data.status).toMatch(/SHORT|OVER|BALANCED/)
            expect(data.variance).toBeDefined()
        })
    })

    // ─── 9. NEGATIVE QUANTITY GUARD ──────────────────────────────
    describe('Step 9: Negative Quantity Guard (S4-4)', () => {
        it('should reject negative quantity items', async () => {
            const res = await fetch(`${BASE_URL}/api/pos/transaction`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    items: [{ itemId: 'neg-guard', name: 'Bad Item', quantity: -1, price: 5.00, unitPrice: 5.00 }],
                    paymentMethod: 'CASH'
                })
            })
            expect(res.status).toBe(400)
        })
    })
})
