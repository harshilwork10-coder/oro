import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'

// STUB: License request feature not yet implemented in current schema
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Return empty array instead of 501 to avoid console errors
    return NextResponse.json({
        success: true,
        requests: []
    })
}
