import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params

        // Find magic link
        const magicLink = await prisma.magicLink.findUnique({
            where: { token },
            include: { user: true }
        })

        if (!magicLink || !magicLink.user) {
            return NextResponse.json({ error: 'Invalid magic link' }, { status: 404 })
        }

        /*
        // Check if already used
        if (magicLink.used) {
            return NextResponse.json({ error: 'Magic link already used' }, { status: 400 })
        }
        */

        // Check if expired
        if (new Date() > magicLink.expiresAt) {
            return NextResponse.json({ error: 'Magic link expired' }, { status: 400 })
        }

        // Delete the magic link to ensure one-time use
        await prisma.magicLink.delete({
            where: { id: magicLink.id }
        })

        // Return user info (frontend will handle session creation)
        return NextResponse.json({
            success: true,
            user: {
                id: magicLink.user.id,
                email: magicLink.user.email,
                name: magicLink.user.name,
                role: magicLink.user.role
            },
            requiresPasswordSetup: true
        })
    } catch (error) {
        console.error('Error validating magic link:', error)
        return NextResponse.json(
            { error: 'Failed to validate magic link' },
            { status: 500 }
        )
    }
}
