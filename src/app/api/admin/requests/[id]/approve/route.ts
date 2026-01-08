import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// STUB: License request approval feature not yet implemented in current schema
// The licenseRequest and license models don't exist in the Prisma schema

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: requestId } = await params

        return NextResponse.json({
            success: false,
            error: 'License request approval feature is not yet implemented',
            requestId
        }, { status: 501 })

    } catch (error) {
        console.error('Error approving request:', error)
        return NextResponse.json(
            { error: 'Failed to approve request' },
            { status: 500 }
        )
    }
}
