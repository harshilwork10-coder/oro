/**
 * Payout Engine Tests - Invariant Tests for Reporting Accuracy
 * 
 * These tests enforce the "Reporting Accuracy Forever" principles:
 * 1. commission + owner = net amount
 * 2. Tips don't affect commission (by default)
 * 3. Refunds net to zero
 * 4. History never changes
 */

import {
    calculateLineItemSnapshot,
    calculateTransactionPayouts,
    createRefundReversals,
    validateCommissionInvariant,
    validateRefundNetsToZero,
    getBusinessDate,
    DEFAULT_PAYOUT_CONFIG,
    type LineItemInput,
    type PayoutConfig
} from '../payoutEngine'

// ============ SNAPSHOT MATH TESTS ============

describe('Snapshot Math Invariants', () => {
    const businessDate = new Date('2026-01-10')
    const config: PayoutConfig = {
        commissionSplit: 50,
        tipHandling: 'BARBER_KEEPS',
        taxRate: 8.25
    }

    describe('Commission + Owner = Net Amount', () => {
        it('should hold for a service with barber', () => {
            const item: LineItemInput = {
                type: 'SERVICE',
                price: 50,
                quantity: 1,
                discount: 0,
                serviceName: 'Haircut',
                barberId: 'barber-123'
            }

            const snapshot = calculateLineItemSnapshot(item, 10, config, businessDate)

            // Invariant: commission + owner = priceCharged - discount
            const netAmount = snapshot.priceCharged - snapshot.discountAllocated
            const split = snapshot.commissionAmount + snapshot.ownerAmount

            expect(split).toBeCloseTo(netAmount, 2)
        })

        it('should hold for a service with discount', () => {
            const item: LineItemInput = {
                type: 'SERVICE',
                price: 100,
                quantity: 1,
                discount: 20, // $20 discount
                serviceName: 'Color Treatment',
                barberId: 'barber-456'
            }

            const snapshot = calculateLineItemSnapshot(item, 15, config, businessDate)

            const netAmount = snapshot.priceCharged - snapshot.discountAllocated
            const split = snapshot.commissionAmount + snapshot.ownerAmount

            expect(split).toBeCloseTo(netAmount, 2)
            expect(validateCommissionInvariant(snapshot)).toBe(true)
        })

        it('should hold for products (owner keeps all)', () => {
            const item: LineItemInput = {
                type: 'PRODUCT',
                price: 25,
                quantity: 2,
                discount: 0,
                productName: 'Shampoo'
            }

            const snapshot = calculateLineItemSnapshot(item, 0, config, businessDate)

            // For products, owner keeps all
            expect(snapshot.commissionAmount).toBe(0)
            expect(snapshot.ownerAmount).toBe(50) // 25 * 2
            expect(validateCommissionInvariant(snapshot)).toBe(true)
        })
    })

    describe('Tips Do Not Affect Commission', () => {
        it('should calculate same commission with or without tip', () => {
            const item: LineItemInput = {
                type: 'SERVICE',
                price: 60,
                quantity: 1,
                discount: 0,
                serviceName: 'Fade',
                barberId: 'barber-789'
            }

            const withTip = calculateLineItemSnapshot(item, 20, config, businessDate)
            const noTip = calculateLineItemSnapshot(item, 0, config, businessDate)

            // Commission should be the same regardless of tip
            expect(withTip.commissionAmount).toBe(noTip.commissionAmount)
            expect(withTip.ownerAmount).toBe(noTip.ownerAmount)

            // Tip should be allocated to barber
            expect(withTip.tipAllocated).toBe(20)
            expect(noTip.tipAllocated).toBe(0)
        })
    })

    describe('Commission Split Application', () => {
        it('should apply 50% split correctly', () => {
            const item: LineItemInput = {
                type: 'SERVICE',
                price: 100,
                quantity: 1,
                discount: 0,
                serviceName: 'Premium Cut',
                barberId: 'barber-123'
            }

            const snapshot = calculateLineItemSnapshot(item, 0, config, businessDate)

            expect(snapshot.commissionSplitUsed).toBe(50)
            expect(snapshot.commissionAmount).toBe(50) // 50% of 100
            expect(snapshot.ownerAmount).toBe(50)      // 50% of 100
        })

        it('should apply custom split correctly', () => {
            const customConfig: PayoutConfig = {
                commissionSplit: 60,
                tipHandling: 'BARBER_KEEPS',
                taxRate: 0
            }

            const item: LineItemInput = {
                type: 'SERVICE',
                price: 100,
                quantity: 1,
                discount: 0,
                serviceName: 'Deluxe Cut',
                barberId: 'barber-123'
            }

            const snapshot = calculateLineItemSnapshot(item, 0, customConfig, businessDate)

            expect(snapshot.commissionSplitUsed).toBe(60)
            expect(snapshot.commissionAmount).toBe(60) // 60% of 100
            expect(snapshot.ownerAmount).toBe(40)      // 40% of 100
        })
    })
})

// ============ TRANSACTION PAYOUT TESTS ============

describe('Transaction Payouts', () => {
    const businessDate = new Date('2026-01-10')
    const config = DEFAULT_PAYOUT_CONFIG

    it('should distribute tip evenly among services', () => {
        const items: LineItemInput[] = [
            { type: 'SERVICE', price: 50, quantity: 1, discount: 0, serviceName: 'Cut', barberId: 'b1' },
            { type: 'SERVICE', price: 30, quantity: 1, discount: 0, serviceName: 'Shave', barberId: 'b2' }
        ]

        const result = calculateTransactionPayouts(items, 20, config, businessDate)

        // Tip should be split: $10 each
        expect(result.lineItemSnapshots[0].tipAllocated).toBe(10)
        expect(result.lineItemSnapshots[1].tipAllocated).toBe(10)
        expect(result.totals.tipTotal).toBe(20)
    })

    it('should not allocate tips to products', () => {
        const items: LineItemInput[] = [
            { type: 'SERVICE', price: 50, quantity: 1, discount: 0, serviceName: 'Cut', barberId: 'b1' },
            { type: 'PRODUCT', price: 20, quantity: 1, discount: 0, productName: 'Gel' }
        ]

        const result = calculateTransactionPayouts(items, 15, config, businessDate)

        // All tip goes to service
        expect(result.lineItemSnapshots[0].tipAllocated).toBe(15)
        expect(result.lineItemSnapshots[1].tipAllocated).toBe(0)
    })

    it('should calculate correct totals', () => {
        const items: LineItemInput[] = [
            { type: 'SERVICE', price: 100, quantity: 1, discount: 10, serviceName: 'Color', barberId: 'b1' }
        ]

        const result = calculateTransactionPayouts(items, 20, config, businessDate)

        expect(result.totals.subtotal).toBe(100)
        expect(result.totals.discountTotal).toBe(10)
        expect(result.totals.commissionTotal).toBe(45) // 50% of (100-10)
        expect(result.totals.ownerTotal).toBe(45)
    })
})

// ============ REFUND REVERSAL TESTS ============

describe('Refund Reversals', () => {
    const businessDate = new Date('2026-01-10')
    const config = DEFAULT_PAYOUT_CONFIG

    it('should create negative snapshots', () => {
        const items: LineItemInput[] = [
            { type: 'SERVICE', price: 80, quantity: 1, discount: 0, serviceName: 'Cut', barberId: 'b1' }
        ]

        const saleResult = calculateTransactionPayouts(items, 10, config, businessDate)
        const reversals = createRefundReversals(saleResult.lineItemSnapshots)

        // All values should be negated
        expect(reversals[0].priceCharged).toBe(-80)
        expect(reversals[0].commissionAmount).toBe(-40)
        expect(reversals[0].ownerAmount).toBe(-40)
        expect(reversals[0].tipAllocated).toBe(-10)
        expect(reversals[0].lineItemStatus).toBe('REFUNDED')
    })

    it('should net to zero when sale + refund', () => {
        const items: LineItemInput[] = [
            { type: 'SERVICE', price: 100, quantity: 1, discount: 0, serviceName: 'Deluxe', barberId: 'b1' }
        ]

        const saleResult = calculateTransactionPayouts(items, 20, config, businessDate)
        const reversals = createRefundReversals(saleResult.lineItemSnapshots)

        // Validate invariant
        expect(validateRefundNetsToZero(saleResult.lineItemSnapshots, reversals)).toBe(true)

        // Manual check
        const saleTotal = saleResult.lineItemSnapshots.reduce(
            (sum, s) => sum + s.commissionAmount + s.tipAllocated, 0
        )
        const refundTotal = reversals.reduce(
            (sum, s) => sum + s.commissionAmount + s.tipAllocated, 0
        )

        expect(saleTotal + refundTotal).toBeCloseTo(0, 2)
    })
})

// ============ HISTORY SAFETY TESTS ============

describe('History Safety', () => {
    it('should return consistent business date', () => {
        const date1 = getBusinessDate()
        const date2 = getBusinessDate()

        // Both should be start of day
        expect(date1.getHours()).toBe(0)
        expect(date1.getMinutes()).toBe(0)
        expect(date2.getHours()).toBe(0)
    })

    it('snapshot status should be PAID by default', () => {
        const item: LineItemInput = {
            type: 'SERVICE',
            price: 50,
            quantity: 1,
            discount: 0,
            serviceName: 'Cut',
            barberId: 'b1'
        }

        const snapshot = calculateLineItemSnapshot(item, 0, DEFAULT_PAYOUT_CONFIG, new Date())

        expect(snapshot.lineItemStatus).toBe('PAID')
    })
})
