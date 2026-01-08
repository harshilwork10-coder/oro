import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// STUB: My orders feature not yet implemented in current schema
// The licenseRequest model doesn't exist in the Prisma schema

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'FRANCHISOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
        success: false,
        error: 'My orders feature is not yet implemented',
        orders: []
    }, { status: 501 })
}

