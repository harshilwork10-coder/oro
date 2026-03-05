/**
 * No-Show Settings API — returns hardcoded defaults
 * (Schema doesn't have these columns on FranchiseSettings yet)
 * GET /api/pos/no-show/settings
 * PUT /api/pos/no-show/settings
 */
import { NextResponse } from 'next/server'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (_req: Request, _ctx: POSContext) => {
    return NextResponse.json({
        success: true,
        data: {
            requireDeposit: false,
            defaultDepositAmount: 25,
            noShowThreshold: 3,
            autoReminder: true,
            reminderHoursBefore: 24
        }
    })
})

export const PUT = withPOSAuth(async (_req: Request, _ctx: POSContext) => {
    // Will persist once schema columns are added
    return NextResponse.json({ success: true })
})
