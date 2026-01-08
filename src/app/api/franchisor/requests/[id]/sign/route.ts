import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// STUB: License request signing feature not yet implemented in current schema
// The licenseRequest model doesn't exist in the Prisma schema

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { id: requestId } = await params

        return NextResponse.json({
            success: false,
            error: 'License request signing feature is not yet implemented',
            requestId
        }, { status: 501 })

    } catch (error) {
        console.error('Error signing request:', error)
        return NextResponse.json(
            { error: 'Failed to sign request' },
            { status: 500 }
        )
    }
}
