import { NextResponse } from 'next/server'

/**
 * PERMANENTLY DISABLED — Go-Live Security Gate
 *
 * This endpoint was used during development to seed the database.
 * It is now permanently blocked regardless of environment.
 *
 * If you need to re-seed, use the Prisma CLI: npx prisma db seed
 */
export async function GET() {
    console.error('[SECURITY] Blocked access to disabled seed endpoint')
    return NextResponse.json(
        { error: 'This endpoint has been permanently disabled.' },
        { status: 403 }
    )
}

export async function POST() {
    return NextResponse.json(
        { error: 'This endpoint has been permanently disabled.' },
        { status: 403 }
    )
}
