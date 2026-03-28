import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

// POST: Upgrade a franchisor from MULTI_LOCATION_OWNER to BRAND_FRANCHISOR
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
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

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: 'PROVIDER',
            action: 'FRANCHISOR_UPGRADED',
            entityType: 'Franchisor',
            entityId: id,
            metadata: { from: current.businessType, to: 'BRAND_FRANCHISOR', name: current.name }
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
