import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Send email notification (gift card delivery, etc.)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { email, subject, body } = await request.json()

        if (!email || !subject) {
            return NextResponse.json({ error: 'Email and subject are required' }, { status: 400 })
        }

        // TODO: Integrate with actual email provider (SendGrid, SES, etc.)
        // For now, log the attempt and return success
        console.log(`[EMAIL] To: ${email}, Subject: ${subject}`)

        return NextResponse.json({
            success: true,
            message: 'Email queued for delivery'
        })
    } catch (error) {
        console.error('[NOTIFICATIONS_EMAIL]', error)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
}
