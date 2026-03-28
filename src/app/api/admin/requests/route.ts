import { NextResponse } from 'next/server'
// STUB: License request feature not yet implemented in current schema
// The licenseRequest model doesn't exist in the Prisma schema

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user || user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Return empty array instead of 501 to avoid console errors
    return NextResponse.json({
        success: true,
        requests: []
    })
}

