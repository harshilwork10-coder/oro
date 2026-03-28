import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'
import { logActivity } from '@/lib/auditLog'

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.email || (user.role !== 'ADMIN' && user.role !== 'PROVIDER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { franchisorId } = body

        if (!franchisorId) {
            return NextResponse.json({ error: 'Missing franchisorId' }, { status: 400 })
        }

        // Get franchisor with owner info
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: {
                owner: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Generate new magic link
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 48) // 48 hour expiry for reminders

        await prisma.magicLink.create({
            data: {
                token,
                userId: franchisor.owner.id,
                email: franchisor.owner.email,
                expiresAt
            }
        })

        const magicLinkUrl = `${process.env.NEXTAUTH_URL}/auth/magic-link/${token}`

        // Send reminder email
        await sendEmail({
            to: franchisor.owner.email,
            subject: 'Reminder: Complete Your Oro Account Setup',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Hi ${franchisor.owner.name || 'there'}!</h1>
                    <p>We noticed your ORO 9 account setup is not yet complete.</p>
                    <p>Please complete your onboarding to activate your account. You may need to upload the following documents:</p>
                    <ul>
                        <li>Driver's License</li>
                        <li>Voided Check</li>
                        <li>FEIN Letter (if applicable)</li>
                    </ul>
                    <br/>
                    <p>Click the link below to continue your setup:</p>
                    <a href="${magicLinkUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Complete Setup</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">This link expires in 48 hours.</p>
                </div>
            `
        })

        // Debug log removed

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role,
            action: 'REMINDER_SENT',
            entityType: 'Franchisor',
            entityId: franchisorId,
            metadata: { ownerEmail: franchisor.owner.email }
        })

        return NextResponse.json({
            success: true,
            message: `Reminder sent to ${franchisor.owner.email}`
        })

    } catch (error) {
        console.error('Error sending reminder:', error)
        return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
    }
}

