import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Fetch franchisor dashboard summary data
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
