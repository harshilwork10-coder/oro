/**
 * SMS Usage API
 * 
 * GET: Get current month's SMS usage and quota for a location
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQuotaInfo } from '@/lib/sms/compliance'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return NextResponse.json({ error: 'locationId required' }, { status: 400 })
        }

        const quota = await getQuotaInfo(locationId)

        return NextResponse.json({
            success: true,
            quota: {
                ...quota,
                totalFree: 1500,
                percentUsed: Math.round((quota.freeUsed / 1500) * 100)
            }
        })

    } catch (error) {
        console.error('[SMS_USAGE]', error)
        return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 })
    }
}
