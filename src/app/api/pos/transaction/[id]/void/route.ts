import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'

/**
 * POST /api/pos/transaction/[id]/void
 * 
 * LEGACY COMPATIBILITY: Redirects to the canonical void route.
 * Extracts the transaction ID from the URL path and forwards
 * to POST /api/pos/void with the body.
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await req.json()

        // Forward to canonical void route
        const origin = new URL(req.url).origin
        const res = await fetch(`${origin}/api/pos/void`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || '',
                'Cookie': req.headers.get('Cookie') || '',
            },
            body: JSON.stringify({
                transactionId: id,
                reason: body.reason,
                reasonCode: body.reasonCode,
                reasonNote: body.reasonNote,
                cashDrawerSessionId: body.cashDrawerSessionId,
                managerPinVerified: body.managerPinVerified,
            })
        })

        const data = await res.json()
        return NextResponse.json(data, { status: res.status })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_VOID_REDIRECT]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
