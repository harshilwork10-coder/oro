import { NextResponse } from 'next/server'

// DISABLED - This endpoint exposed all businesses in the system
// Now using /api/pos/validate-setup-code for secure terminal pairing

export async function GET() {
    // Security: Don't expose business list to public
    return NextResponse.json({
        error: 'This endpoint has been disabled for security. Use setup codes for terminal pairing.'
    }, { status: 403 })
}

