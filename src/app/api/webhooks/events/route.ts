import { NextRequest, NextResponse } from 'next/server'

// Webhook to notify provider when client adds location
// SECURITY: Requires valid webhook secret to prevent unauthorized calls

// SECURITY: No fallback - must be configured in environment
const WEBHOOK_SECRET = process.env.INTERNAL_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Reject if webhook secret not configured
        if (!WEBHOOK_SECRET) {
            console.error('[SECURITY] Webhook secret not configured')
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
        }

        // SECURITY: Verify webhook secret
        const authHeader = request.headers.get('x-webhook-secret')
        if (authHeader !== WEBHOOK_SECRET) {
            console.error('[SECURITY] Unauthorized webhook attempt')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { event, data } = await request.json()

        if (event === 'location.created') {
            // Process location creation
            return NextResponse.json({
                success: true,
                message: 'Location creation webhook processed'
            })
        }

        if (event === 'agent.client_added') {
            // Process agent client addition
            return NextResponse.json({
                success: true,
                message: 'Agent client webhook processed'
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}

