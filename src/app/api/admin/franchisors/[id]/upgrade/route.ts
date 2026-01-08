import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Upgrade a franchisor from MULTI_LOCATION_OWNER to BRAND_FRANCHISOR
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { id } = await params

        // Get current account
        const current = await prisma.franchisor.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                businessType: true,
                approvalStatus: true
            }
        })

        if (!current) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        if (current.businessType === 'BRAND_FRANCHISOR') {
            return NextResponse.json({ error: 'Already a Brand Franchisor account' }, { status: 400 })
        }

        // Upgrade to Brand Franchisor
        const upgraded = await prisma.franchisor.update({
            where: { id },
            data: {
                businessType: 'BRAND_FRANCHISOR'
            },
            select: {
                id: true,
                name: true,
                businessType: true,
                approvalStatus: true,
                updatedAt: true
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Account upgraded to Brand Franchisor successfully',
            franchisor: upgraded
        })
    } catch (error) {
        console.error('Error upgrading account:', error)
        return NextResponse.json({ error: 'Failed to upgrade account' }, { status: 500 })
    }
}
