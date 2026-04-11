import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
// POST - Send SMS notification (gift card delivery, etc.)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { phone, message } = await req.json()

        if (!phone || !message) {
            return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 })
        }

        // TODO: Integrate with actual SMS provider (Twilio, etc.)
        // For now, log the attempt and return success
        console.log(`[SMS] To: ${phone}, Message: ${message.substring(0, 50)}...`)

        return NextResponse.json({
            success: true,
            message: 'SMS queued for delivery'
        })
    } catch (error) {
        console.error('[NOTIFICATIONS_SMS]', error)
        return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
    }
}
