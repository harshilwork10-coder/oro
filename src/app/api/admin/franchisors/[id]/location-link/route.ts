import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// POST: Generate magic link for adding a new location
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
            include: {
                owner: true,
                franchises: true
            }
        })

        if (!franchisor || !franchisor.owner) {
            return NextResponse.json({ error: 'Franchisor or owner not found' }, { status: 404 })
        }

        // Get the franchise to add location to
        const franchise = franchisor.franchises[0]
        if (!franchise) {
            return NextResponse.json({ error: 'No franchise found for this owner' }, { status: 404 })
        }

        // Generate new token
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        // Create magic link with purpose embedded in token
        // We'll use a special prefix to identify location magic links
        const locationToken = `loc_${token}`

        await prisma.magicLink.create({
            data: {
                token: locationToken,
                email: franchisor.owner.email,
                userId: franchisor.owner.id,
                expiresAt
            }
        })

        // Store the franchise ID in a separate record so we know which franchise to add to
        // We'll use metadata in the URL itself
        const origin = request.headers.get('origin') || request.headers.get('host') || 'http://localhost:3000'
        const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
        const url = `${baseUrl}/onboarding/add-location/${locationToken}?fid=${franchise.id}`

        return NextResponse.json({
            success: true,
            token: locationToken,
            url,
            message: `Location onboarding link generated for ${franchisor.owner.email}`
        })

    } catch (error) {
        console.error('Error generating location magic link:', error)
        return NextResponse.json(
            { error: 'Failed to generate magic link' },
            { status: 500 }
        )
    }
}
