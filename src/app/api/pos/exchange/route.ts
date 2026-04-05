import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/pos/exchange — DISABLED
 * 
 * This route is disabled pending a full rewrite.
 * The previous implementation had critical issues:
 * - Wrong model field references (items vs lineItems)
 * - No refund/financial rule enforcement
 * - No franchise scoping
 * - No idempotency
 * - Non-functional inventory adjustment
 * 
 * DO NOT RE-ENABLE until a proper exchange flow is implemented
 * that enforces refund rules on the return side.
 */
export async function POST(_req: NextRequest) {
    return NextResponse.json({
        error: 'Feature temporarily unavailable',
        message: 'Exchange processing is being upgraded for financial compliance. Please process as a refund + new sale instead.',
        code: 'EXCHANGE_DISABLED'
    }, { status: 503 })
}
