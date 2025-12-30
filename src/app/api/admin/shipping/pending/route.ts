import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// STUB: Shipping pending feature not yet implemented in current schema
// The licenseRequest model doesn't exist in the Prisma schema

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
        success: false,
        error: 'Shipping pending feature is not yet implemented',
        orders: []
    }, { status: 501 })
}

