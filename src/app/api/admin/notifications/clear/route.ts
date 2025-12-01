import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    // Clear all notifications
    // In production, update database
    return NextResponse.json({ success: true })
}
