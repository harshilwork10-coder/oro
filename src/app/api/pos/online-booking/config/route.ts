/**
 * Online Booking Config API — returns hardcoded defaults
 * (Schema doesn't have booking-specific columns on FranchiseSettings yet)
 * GET /api/pos/online-booking/config
 * PUT /api/pos/online-booking/config
 */
import { NextResponse } from 'next/server'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (_req: Request, _ctx: POSContext) => {
    return NextResponse.json({
        success: true,
        data: {
            widgetEnabled: false,
            widgetUrl: '',
            googleBookingEnabled: false,
            instagramLinkEnabled: false,
            requireDeposit: false,
            depositAmount: 0,
            maxAdvanceDays: 30,
            minNoticeHours: 2
        }
    })
})

export const PUT = withPOSAuth(async (_req: Request, _ctx: POSContext) => {
    // Will persist once schema columns are added
    return NextResponse.json({ success: true })
})
