import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Mark account as payment due or mark as paid
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
        const { action, amountDue, dueDate } = body // action: 'mark_due' | 'mark_paid'

        const franchise = await prisma.franchise.findUnique({
            where: { id }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        if (action === 'mark_due') {
            // Block access due to unpaid subscription
            await prisma.franchise.update({
                where: { id },
                data: {
                    accountStatus: 'PAYMENT_DUE',
                    suspendedAt: new Date(),
                    suspendedReason: `Payment of $${amountDue || 'N/A'} due${dueDate ? ` since ${dueDate}` : ''}`,
                    suspendedBy: session.user.id
                }
            })

            // Debug log removed marked as payment due by ${session.user.email}. Amount: $${amountDue}`)

            return NextResponse.json({
                success: true,
                message: `Account marked as payment due. Access is temporarily restricted.`,
                amountDue
            })

        } else if (action === 'mark_paid') {
            // Reactivate access after payment received
            await prisma.franchise.update({
                where: { id },
                data: {
                    accountStatus: 'ACTIVE',
                    suspendedAt: null,
                    suspendedReason: null,
                    suspendedBy: null
                }
            })

            // Debug log removed payment received, access restored by ${session.user.email}`)

            return NextResponse.json({
                success: true,
                message: `Payment received. Account access has been restored.`
            })

        } else {
            return NextResponse.json({ error: 'Invalid action. Use "mark_due" or "mark_paid"' }, { status: 400 })
        }

    } catch (error) {
        console.error('Payment status error:', error)
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
    }
}
