import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch franchisor dashboard summary data
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // TODO: Aggregate franchisee performance data
        return NextResponse.json({
            totalLocations: 0,
            activeLocations: 0,
            totalRevenue: 0,
            totalRoyalties: 0,
            topPerformers: []
        })
    } catch (error) {
        console.error('[FRANCHISOR_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}
