import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Mark notification as read
    // In production, update database
    return NextResponse.json({ success: true })
}
