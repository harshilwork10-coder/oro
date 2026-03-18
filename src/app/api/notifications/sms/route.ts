import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Send SMS notification (gift card delivery, etc.)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { phone, message } = await request.json()

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
