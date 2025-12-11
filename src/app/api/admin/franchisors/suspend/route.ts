import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Suspend, Activate, or Terminate a franchisor account
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { role?: string }

        // Only PROVIDER can manage account status
        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can manage account status' }, { status: 403 })
        }

        const body = await request.json()
        const { franchisorId, action, reason } = body

        if (!franchisorId) {
            return NextResponse.json({ error: 'franchisorId is required' }, { status: 400 })
        }

        if (!action || !['SUSPEND', 'ACTIVATE', 'TERMINATE'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Must be SUSPEND, ACTIVATE, or TERMINATE' }, { status: 400 })
        }

        // Find the franchisor
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: { owner: { select: { name: true, email: true } } }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Handle different actions
        let newStatus: string
        let suspendedAt: Date | null = null
        let suspendedReason: string | null = null

        switch (action) {
            case 'SUSPEND':
                newStatus = 'SUSPENDED'
                suspendedAt = new Date()
                suspendedReason = reason || 'Account suspended by provider'
                break
            case 'ACTIVATE':
                newStatus = 'ACTIVE'
                suspendedAt = null
                suspendedReason = null
                break
            case 'TERMINATE':
                newStatus = 'TERMINATED'
                suspendedAt = new Date()
                suspendedReason = reason || 'Account terminated by provider'
                break
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        // Update the franchisor
        const updated = await prisma.franchisor.update({
            where: { id: franchisorId },
            data: {
                accountStatus: newStatus,
                suspendedAt,
                suspendedReason
            },
            include: {
                owner: { select: { name: true, email: true } }
            }
        })

        console.log(`🔒 Account ${action}: ${franchisor.name || franchisor.owner?.email} - ${newStatus}`)

        // TODO: Send email notification to the franchisor about account status change

        return NextResponse.json({
            success: true,
            franchisorId: updated.id,
            name: updated.name,
            accountStatus: updated.accountStatus,
            suspendedAt: updated.suspendedAt,
            suspendedReason: updated.suspendedReason,
            message: `Account ${action.toLowerCase()}ed successfully`
        })
    } catch (error) {
        console.error('Error managing account status:', error)
        return NextResponse.json({ error: 'Failed to update account status' }, { status: 500 })
    }
}

// GET - Get all suspended/terminated accounts
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { role?: string }

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can view this' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // SUSPENDED, TERMINATED, or null for all

        const where: { accountStatus?: string } = {}
        if (status) {
            where.accountStatus = status
        }

        const franchisors = await prisma.franchisor.findMany({
            where: {
                accountStatus: { in: ['SUSPENDED', 'TERMINATED'] }
            },
            include: {
                owner: { select: { name: true, email: true } },
                _count: { select: { franchises: true } }
            },
            orderBy: { suspendedAt: 'desc' }
        })

        return NextResponse.json(franchisors)
    } catch (error) {
        console.error('Error fetching suspended accounts:', error)
        return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }
}
