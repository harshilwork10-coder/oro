import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Await params for Next.js 15+
        const { id } = await params

        // Get franchisor to find owner
        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            select: { ownerId: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Find latest magic link
        const magicLink = await prisma.magicLink.findFirst({
            where: { userId: franchisor.ownerId },
            orderBy: { createdAt: 'desc' }
        })

        if (!magicLink) {
            return NextResponse.json({ error: 'No active setup link found' }, { status: 404 })
        }

        // Construct full URL
        const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/magic-link/${magicLink.token}`

        return NextResponse.json({ url })
    } catch (error) {
        console.error('Error fetching magic link:', error)
        return NextResponse.json({ error: 'Failed to fetch link' }, { status: 500 })
    }
}
