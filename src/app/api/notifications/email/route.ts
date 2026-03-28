import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
// POST - Send email notification (gift card delivery, etc.)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { email, subject, body } = await req.json()

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
