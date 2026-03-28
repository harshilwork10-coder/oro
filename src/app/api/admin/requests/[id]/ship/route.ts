import { NextRequest, NextResponse } from 'next/server'
// STUB: License request shipping feature not yet implemented in current schema
// The licenseRequest model doesn't exist in the Prisma schema

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: requestId } = await params

        return NextResponse.json({
            success: false,
            error: 'License request shipping feature is not yet implemented',
            requestId
        }, { status: 501 })

    } catch (error) {
        console.error('Error marking as shipped:', error)
        return NextResponse.json(
            { error: 'Failed to mark as shipped' },
            { status: 500 }
        )
    }
}
