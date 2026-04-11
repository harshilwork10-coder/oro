import { NextRequest, NextResponse } from 'next/server'
// STUB: Sales agent tracking feature not yet implemented in current schema
// The salesAgentId and deletedAt fields don't exist on Franchisor

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user || user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
        success: false,
        error: 'Sales agent tracking feature is not yet implemented',
        sales: []
    }, { status: 501 })
}

