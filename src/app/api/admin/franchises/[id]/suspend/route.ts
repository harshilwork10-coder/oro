import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Suspend a franchise account
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized - Provider only' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { reason, action } = body // action: 'suspend' | 'unsuspend'

        // Verify franchise exists
        const franchise = await prisma.franchise.findUnique({
            where: { id },
            include: { users: true }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        if (action === 'suspend') {
            // Suspend the account
            await prisma.franchise.update({
                where: { id },
                data: {
                    accountStatus: 'SUSPENDED',
                    suspendedAt: new Date(),
                    suspendedReason: reason || 'Account suspended by provider',
                    suspendedBy: session.user.id
                }
            })

            // Log the action
            console.log(`[ACCOUNT_SUSPEND] Franchise ${franchise.name} (${id}) suspended by ${session.user.email}. Reason: ${reason}`)

            return NextResponse.json({
                success: true,
                message: `Account "${franchise.name}" has been suspended`,
                affectedUsers: franchise.users.length
            })

        } else if (action === 'unsuspend') {
            // Reactivate the account
            await prisma.franchise.update({
                where: { id },
                data: {
                    accountStatus: 'ACTIVE',
                    suspendedAt: null,
                    suspendedReason: null,
                    suspendedBy: null,
                    scheduledDeletionAt: null // Cancel any pending deletion
                }
            })

            console.log(`[ACCOUNT_UNSUSPEND] Franchise ${franchise.name} (${id}) reactivated by ${session.user.email}`)

            return NextResponse.json({
                success: true,
                message: `Account "${franchise.name}" has been reactivated`
            })

        } else {
            return NextResponse.json({ error: 'Invalid action. Use "suspend" or "unsuspend"' }, { status: 400 })
        }

    } catch (error) {
        console.error('Account suspension error:', error)
        return NextResponse.json({ error: 'Failed to update account status' }, { status: 500 })
    }
}
