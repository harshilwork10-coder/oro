import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { subFranchiseeId } = body

        if (!subFranchiseeId) {
            return NextResponse.json({ error: 'Sub-Franchisee ID is required' }, { status: 400 })
        }

        // Find the pending sub-franchisee record
        const subFranchisee = await prisma.subFranchisee.findUnique({
            where: { id: subFranchiseeId }
        })

        if (!subFranchisee) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
        }

        if (subFranchisee.status !== 'PENDING') {
            return NextResponse.json({ error: 'This invitation has already been accepted or is invalid.' }, { status: 400 })
        }

        // Transaction to link user and update role
        await prisma.$transaction(async (tx) => {
            // 1. Update SubFranchisee
            await tx.subFranchisee.update({
                where: { id: subFranchiseeId },
                data: {
                    userId: user.id,
                    status: 'ACTIVE',
                    acceptedAt: new Date()
                }
            })

            // 2. Update User Role
            await tx.user.update({
                where: { id: user.id },
                data: {
                    role: 'SUB_FRANCHISEE'
                }
            })
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: 'SUB_FRANCHISEE',
            action: 'INVITE_ACCEPTED',
            entityType: 'SubFranchisee',
            entityId: subFranchiseeId,
            metadata: { previousRole: user.role }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error accepting invitation:', error)
        return NextResponse.json(
            { error: 'Failed to accept invitation' },
            { status: 500 }
        )
    }
}
