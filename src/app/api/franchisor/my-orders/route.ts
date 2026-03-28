import { NextResponse } from 'next/server'
// STUB: My orders feature not yet implemented in current schema
// The licenseRequest model doesn't exist in the Prisma schema

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user || user.role !== 'FRANCHISOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
        success: false,
        error: 'My orders feature is not yet implemented',
        orders: []
    }, { status: 501 })
}

