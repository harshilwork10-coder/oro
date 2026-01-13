import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params

        // Find magic link with user and their franchisor/franchise details
        const magicLink = await prisma.magicLink.findUnique({
            where: { token },
            include: {
                user: {
                    include: {
                        franchisor: true,
                        franchise: true // Include Franchise for Franchisees
                    }
                }
            }
        })

        if (!magicLink || !magicLink.user) {
            return NextResponse.json({ error: 'Invalid magic link' }, { status: 404 })
        }

        // Check if expired (48 hours)
        if (new Date() > magicLink.expiresAt) {
            return NextResponse.json({ error: 'Magic link has expired' }, { status: 400 })
        }

        // Check if already completed
        if (magicLink.completedAt) {
            return NextResponse.json({
                error: 'This invite has already been completed',
                completed: true
            }, { status: 400 })
        }

        // Return user info (frontend will handle session creation)
        // We do NOT delete the token here anymore, as it's reusable until completion
        return NextResponse.json({
            success: true,
            user: {
                id: magicLink.user.id,
                email: magicLink.user.email,
                name: magicLink.user.name,
                role: magicLink.user.role
            },
            franchisor: magicLink.user.franchisor ? {
                name: magicLink.user.franchisor.name,
                businessType: magicLink.user.franchisor.businessType,
                approvalStatus: magicLink.user.franchisor.approvalStatus,
                processingType: magicLink.user.franchisor.processingType || 'POS_AND_PROCESSING'
            } : null,
            franchise: magicLink.user.franchise ? {
                id: magicLink.user.franchise.id,
                name: magicLink.user.franchise.name
            } : null,
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
