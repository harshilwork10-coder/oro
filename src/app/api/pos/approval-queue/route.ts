import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'

/**
 * POST /api/pos/approval-queue — Submit void/refund/override for manager approval
 * GET /api/pos/approval-queue — List pending approvals (manager+ only)
 * PUT /api/pos/approval-queue — Approve or deny a request (manager+ only)
 *
 * Uses AuditLog for approval tracking (StoreException is for operational alerts only)
 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await request.json()
        const { type, transactionId, itemId, amount, reason } = body

        if (!type) return NextResponse.json({ error: 'type required (VOID, REFUND, PRICE_OVERRIDE, DISCOUNT)' }, { status: 400 })

        // Store approval request in audit log
        const entry = await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.APPROVAL_REQUESTED,
            entityType: 'ApprovalRequest', entityId: transactionId || 'pending',
            details: {
                requestedAction: type,
                transactionId, itemId, amount, reason,
                status: 'PENDING',
                requestedAt: new Date().toISOString()
            }
        })

        return NextResponse.json({
            message: 'Submitted for manager approval',
            requestType: type,
            status: 'PENDING'
        }, { status: 201 })
    } catch (error: any) {
        console.error('[APPROVAL_QUEUE_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to submit' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isManager = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)
    if (!isManager) return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })

    try {
        // Find pending approval requests from audit log
        const pending = await prisma.auditLog.findMany({
            where: {
                franchiseId: user.franchiseId,
                action: ActionTypes.APPROVAL_REQUESTED,
                changes: { contains: '"status":"PENDING"' }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        const requests = pending.map(log => ({
            id: log.id,
            requestedBy: log.userEmail,
            requestedAt: log.createdAt,
            details: log.changes ? JSON.parse(log.changes) : {}
        }))

        return NextResponse.json({ requests })
    } catch (error: any) {
        console.error('[APPROVAL_QUEUE_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isManager = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)
    if (!isManager) return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })

    try {
        const body = await request.json()
        const { id, action, notes } = body

        if (!id || !action) return NextResponse.json({ error: 'id and action (APPROVE/DENY) required' }, { status: 400 })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: action === 'APPROVE' ? ActionTypes.APPROVAL_GRANTED : ActionTypes.APPROVAL_DENIED,
            entityType: 'ApprovalRequest', entityId: id,
            details: { decision: action, notes, decidedAt: new Date().toISOString() }
        })

        return NextResponse.json({ id, status: action })
    } catch (error: any) {
        console.error('[APPROVAL_QUEUE_PUT]', error)
        return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
    }
}
