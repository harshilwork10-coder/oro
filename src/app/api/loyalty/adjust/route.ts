import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * POST /api/loyalty/adjust
 *
 * Manual points adjustment with reason + audit trail.
 * Only OWNER, MANAGER, PROVIDER can adjust.
 *
 * Body: {
 *   memberId: string,       — loyalty member to adjust
 *   points: number,         — positive to add, negative to subtract
 *   reason: string,         — required explanation
 * }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check
    if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
        return NextResponse.json({ error: 'Permission denied: Only owners/managers can adjust points' }, { status: 403 })
    }

    try {
        const { memberId, points, reason } = await req.json()

        if (!memberId) {
            return NextResponse.json({ error: 'memberId required' }, { status: 400 })
        }

        if (!points || points === 0) {
            return NextResponse.json({ error: 'Points amount required (positive to add, negative to subtract)' }, { status: 400 })
        }

        if (!reason || reason.trim().length < 3) {
            return NextResponse.json({ error: 'Reason required (min 3 characters)' }, { status: 400 })
        }

        // Find member and verify franchise ownership
        const member = await prisma.loyaltyMember.findUnique({
            where: { id: memberId },
            include: {
                program: {
                    select: {
                        id: true,
                        franchiseId: true,
                        name: true
                    }
                }
            }
        })

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        // Verify the member belongs to the user's franchise
        if (member.program.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Member does not belong to your franchise' }, { status: 403 })
        }

        // Check for negative adjustment that would go below zero
        const newBalance = member.pointsBalance + points
        if (newBalance < 0) {
            return NextResponse.json({
                error: 'Adjustment would result in negative balance',
                currentBalance: member.pointsBalance,
                requestedAdjustment: points,
                wouldResultIn: newBalance
            }, { status: 400 })
        }

        // Apply adjustment
        const updated = await prisma.loyaltyMember.update({
            where: { id: memberId },
            data: {
                pointsBalance: { increment: points },
                lastActivity: new Date()
            }
        })

        // Record the adjustment transaction with audit metadata
        const adjustmentMetadata = {
            adjustedBy: user.id,
            adjustedByName: user.name || user.email,
            adjustedByRole: user.role,
            reason: reason.trim(),
            previousBalance: member.pointsBalance,
            newBalance: updated.pointsBalance,
            adjustmentAmount: points,
            timestamp: new Date().toISOString()
        }

        await prisma.pointsTransaction.create({
            data: {
                programId: member.program.id,
                memberId: member.id,
                type: 'ADJUST',
                points: points,
                description: `Manual adjustment: ${reason.trim()} (by ${user.name || user.email})`,
                franchiseId: user.franchiseId,
                metadata: JSON.stringify(adjustmentMetadata)
            }
        })

        // Audit log for compliance
        await logActivity({
            userId: user.id,
            userEmail: user.email || '',
            userRole: user.role,
            action: 'LOYALTY_POINTS_ADJUST',
            entityType: 'LoyaltyMember',
            entityId: memberId,
            details: {
                memberPhone: member.phone,
                memberName: member.name,
                previousBalance: member.pointsBalance,
                adjustment: points,
                newBalance: updated.pointsBalance,
                reason: reason.trim()
            }
        })

        return NextResponse.json({
            success: true,
            memberId: member.id,
            memberPhone: member.phone,
            memberName: member.name,
            previousBalance: member.pointsBalance,
            adjustment: points,
            newBalance: updated.pointsBalance,
            reason: reason.trim(),
            adjustedBy: user.name || user.email
        })
    } catch (error) {
        console.error('[LOYALTY_ADJUST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
