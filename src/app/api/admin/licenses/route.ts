import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// STUB: License management feature not yet implemented in current schema
// The License model does not exist in the Prisma schema

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['PROVIDER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
        success: false,
        error: 'License management feature is not yet implemented',
        licenses: []
    }, { status: 501 })
}

export async function POST(req: NextRequest) {
    return NextResponse.json({
        success: false,
        error: 'License management feature is not yet implemented'
    }, { status: 501 })
}

export async function PATCH(req: NextRequest) {
    return NextResponse.json({
        success: false,
        error: 'License management feature is not yet implemented'
    }, { status: 501 })
}

export async function PUT(req: NextRequest) {
    return NextResponse.json({
        success: false,
        error: 'License management feature is not yet implemented'
    }, { status: 501 })
}
