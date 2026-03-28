import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { logActivity } from '@/lib/auditLog'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await params

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get franchisor to find owner
        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            include: { owner: true }
        })

        if (!franchisor || !franchisor.owner) {
            return NextResponse.json({ error: 'Franchisor or owner not found' }, { status: 404 })
        }

        // Generate new token
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

        // Create new magic link
        await prisma.magicLink.create({
            data: {
                token,
                email: franchisor.owner.email,
                userId: franchisor.owner.id,
                expiresAt
            }
        })

        // Get origin from request
        const origin = req.headers.get('origin') || req.headers.get('host') || 'http://localhost:3000'
        const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
        const url = `${baseUrl}/auth/magic-link/${token}`

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: 'PROVIDER',
            action: 'MAGIC_LINK_GENERATED',
            entityType: 'Franchisor',
            entityId: id,
            metadata: { ownerEmail: franchisor.owner.email }
        })

        return NextResponse.json({ success: true, token, url })

    } catch (error) {
        console.error('Error generating magic link:', error)
        return NextResponse.json(
            { error: 'Failed to generate magic link' },
            { status: 500 }
        )
    }
}
