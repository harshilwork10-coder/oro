import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// STUB: Sales agent tracking feature not yet implemented in current schema
// The salesAgentId and deletedAt fields don't exist on Franchisor

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
        success: false,
        error: 'Sales agent tracking feature is not yet implemented',
        sales: []
    }, { status: 501 })
}

