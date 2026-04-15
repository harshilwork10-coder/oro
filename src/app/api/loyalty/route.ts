import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

export async function GET(req: Request) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const franchiseId = searchParams.get('franchiseId') || user.franchiseId

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
        }

        const loyaltyProgram = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId }
        })

        return NextResponse.json(loyaltyProgram)
    } catch (error) {
        console.error('Error fetching loyalty program:', error)
        return NextResponse.json({ error: 'Failed to fetch loyalty program' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Use session franchiseId — NEVER trust client-provided franchiseId for writes
        const franchiseId = user.franchiseId
        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Only OWNER, MANAGER, PROVIDER can manage loyalty settings
        if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await req.json()
        const { isEnabled, pointsPerDollar, redemptionRatio } = body

        const loyaltyProgram = await prisma.loyaltyProgram.upsert({
            where: { franchiseId },
            create: {
                franchiseId,
                isEnabled: isEnabled !== undefined ? isEnabled : true,
                pointsPerDollar: parseFloat(pointsPerDollar || '1.0'),
                redemptionRatio: parseFloat(redemptionRatio || '0.01')
            },
            update: {
                isEnabled,
                pointsPerDollar: parseFloat(pointsPerDollar),
                redemptionRatio: parseFloat(redemptionRatio)
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'LOYALTY_SETTINGS_UPDATE',
            entityType: 'LoyaltyProgram',
            entityId: franchiseId,
            details: { isEnabled, pointsPerDollar, redemptionRatio }
        })

        return NextResponse.json(loyaltyProgram)
    } catch (error) {
        console.error('Error updating loyalty program:', error)
        return NextResponse.json({ error: 'Failed to update loyalty program' }, { status: 500 })
    }
}
