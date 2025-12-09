import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || (session.user.role !== 'ADMIN' && session.user.role !== 'PROVIDER')) {
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
            subject: 'Reminder: Complete Your Trinex Account Setup',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Hi ${franchisor.owner.name || 'there'}!</h1>
                    <p>We noticed your Trinex account setup is not yet complete.</p>
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

        console.log(`[Reminder Email] Sent to ${franchisor.owner.email} with magic link`)

        return NextResponse.json({
            success: true,
            message: `Reminder sent to ${franchisor.owner.email}`
        })

    } catch (error) {
        console.error('Error sending reminder:', error)
        return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
    }
}
