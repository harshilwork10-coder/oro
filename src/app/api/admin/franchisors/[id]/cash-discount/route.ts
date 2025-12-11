import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// STUB: Cash discount feature not yet implemented in current schema
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)

        // ONLY PROVIDER ROLE
        if (session?.user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized - Provider only' }, { status: 403 })
        }

        // Feature not implemented yet
        return NextResponse.json({
            success: false,
            error: 'Cash discount feature is not yet implemented in the current schema',
            franchisorId: id
        }, { status: 501 })

    } catch (error) {
        console.error('Error updating cash discount:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
