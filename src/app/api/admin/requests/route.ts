import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// STUB: License request feature not yet implemented in current schema
// The licenseRequest model doesn't exist in the Prisma schema

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Return empty array instead of 501 to avoid console errors
    return NextResponse.json({
        success: true,
        requests: []
    })
}

