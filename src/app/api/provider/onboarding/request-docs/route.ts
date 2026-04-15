import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user || user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { franchisorId, subject, message } = body

        if (!franchisorId || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get franchisor details
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: { owner: true }
        })

        if (!franchisor || !franchisor.owner?.email) {
            return NextResponse.json({ error: 'Client or contact email not found' }, { status: 404 })
        }

        // Send email
        await sendEmail({
            to: franchisor.owner.email,
            subject: subject || `Action Required: Additional Documents for ${franchisor.name}`,
            text: message,
            html: `<div style="font-family: sans-serif; color: #333;">
                <h2>Document Request for ${franchisor.name}</h2>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p style="font-size: 12px; color: #666;">Sent via Oro 9 Provider Portal</p>
            </div>`
        })

        return NextResponse.json({ success: true, message: 'Email sent successfully' })
    } catch (error) {
        console.error('Error sending document request:', error)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
}
