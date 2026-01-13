import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
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
                    userId: session.user.id,
                    status: 'ACTIVE',
                    acceptedAt: new Date()
                }
            })

            // 2. Update User Role
            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    role: 'SUB_FRANCHISEE'
                }
            })
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
