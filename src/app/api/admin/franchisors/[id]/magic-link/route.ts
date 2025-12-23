import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { id } = await params

        if (!session?.user || session.user.role !== 'PROVIDER') {
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
        const origin = request.headers.get('origin') || request.headers.get('host') || 'http://localhost:3000'
        const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
        const url = `${baseUrl}/auth/magic-link/${token}`

        return NextResponse.json({ success: true, token, url })

    } catch (error) {
        console.error('Error generating magic link:', error)
        return NextResponse.json(
            { error: 'Failed to generate magic link' },
            { status: 500 }
        )
    }
}
