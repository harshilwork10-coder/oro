import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validatePassword, getPasswordRequirementsText } from '@/lib/security'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, password, token } = body

        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 })
        }

        // Validate password complexity
        const validation = validatePassword(password)
        if (!validation.valid) {
            return NextResponse.json({
                error: 'Password does not meet requirements',
                details: validation.errors,
                requirements: getPasswordRequirementsText()
            }, { status: 400 })
        }

        let targetUserId: string

        // SECURITY: Validate either magic link token OR authenticated session
        if (token) {
            // Magic link flow - validate token
            const magicLink = await prisma.magicLink.findUnique({
                where: { token },
                include: { user: true }
            })

            if (!magicLink || !magicLink.user) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
            }

            if (magicLink.expiresAt < new Date()) {
                return NextResponse.json({ error: 'Token has expired' }, { status: 401 })
            }

            if (magicLink.completedAt) {
                return NextResponse.json({ error: 'Token has already been used' }, { status: 401 })
            }

            targetUserId = magicLink.userId!

            // Mark magic link as completed
            await prisma.magicLink.update({
                where: { token },
                data: { completedAt: new Date() }
            })
        } else {
            // Session-based - user changing their own password
            const session = await getServerSession(authOptions)
            if (!session?.user) {
                return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
            }

            // Users can only change their own password via this endpoint
            if (userId && userId !== session.user.id) {
                return NextResponse.json({ error: 'You can only change your own password' }, { status: 403 })
            }

            targetUserId = session.user.id
        }

        // Hash new password
        const hashedPassword = await hash(password, 12)

        // Update user password and terms acceptance
        await prisma.user.update({
            where: { id: targetUserId },
            data: {
                password: hashedPassword,
                acceptedTermsAt: new Date(),
                acceptedTermsVersion: '1.0'
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Password set successfully'
        })
    } catch (error) {
        console.error('Error setting password:', error)
        return NextResponse.json(
            { error: 'Failed to set password' },
            { status: 500 }
        )
    }
}

