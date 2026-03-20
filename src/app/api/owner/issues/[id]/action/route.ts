import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    getOwnerContext,
    validateTransition,
    actionToStatus,
    actionToEventType,
    type IssueAction,
} from '@/lib/owner-intelligence'
import type { OwnerIssueResolvedReason } from '@prisma/client'

/**
 * Issue Action Handler — POST /api/owner/issues/[id]/action
 * 
 * Actions: ACKNOWLEDGE, ASSIGN, SNOOZE, RESOLVE, ESCALATE, NOTE, REOPEN
 * Supports optimistic concurrency via expectedVersion.
 * Every action creates an OwnerIssueEvent audit record.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const ctx = await getOwnerContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const {
            action,
            expectedVersion,
            assignToUserId,
            assignToName,
            dueAt,
            snoozeDurationMin,
            resolvedReason,
            escalateToUserId,
            note,
        } = body as {
            action: IssueAction
            expectedVersion?: number
            assignToUserId?: string
            assignToName?: string
            dueAt?: string
            snoozeDurationMin?: number
            resolvedReason?: OwnerIssueResolvedReason
            escalateToUserId?: string
            note?: string
        }

        if (!action) {
            return NextResponse.json({ error: 'action is required' }, { status: 400 })
        }

        const result = await prisma.$transaction(async (tx) => {
            const issue = await tx.ownerIssue.findUnique({
                where: { id: params.id },
            })

            if (!issue) throw new Error('NOT_FOUND')
            if (issue.franchiseId !== ctx.franchiseId) throw new Error('FORBIDDEN')

            // Optimistic concurrency check
            if (expectedVersion !== undefined && expectedVersion !== issue.version) {
                throw new Error('CONFLICT')
            }

            // State machine validation
            const error = validateTransition(issue.status, action)
            if (error) throw new Error(`INVALID: ${error}`)

            const newStatus = actionToStatus(action)
            const eventType = actionToEventType(action)
            const now = new Date()

            // Build update data
            const updateData: any = { version: { increment: 1 } }
            const eventMeta: any = {}

            if (newStatus) {
                updateData.status = newStatus
            }

            switch (action) {
                case 'ACKNOWLEDGE':
                    updateData.acknowledgedById = ctx.userId
                    updateData.acknowledgedAt = now
                    break

                case 'ASSIGN':
                    if (!assignToUserId) throw new Error('INVALID: assignToUserId required')
                    updateData.assignedToId = assignToUserId
                    updateData.assignedToName = assignToName || null
                    updateData.assignedAt = now
                    if (dueAt) updateData.dueAt = new Date(dueAt)
                    eventMeta.assignedTo = assignToUserId
                    eventMeta.dueAt = dueAt
                    break

                case 'SNOOZE':
                    if (!snoozeDurationMin) throw new Error('INVALID: snoozeDurationMin required')
                    updateData.snoozedUntil = new Date(now.getTime() + snoozeDurationMin * 60000)
                    eventMeta.snoozedUntil = updateData.snoozedUntil
                    break

                case 'RESOLVE':
                    updateData.resolvedById = ctx.userId
                    updateData.resolvedAt = now
                    updateData.workflowResolvedAt = now
                    updateData.resolutionNote = note || null
                    updateData.resolvedReason = resolvedReason || null
                    break

                case 'ESCALATE':
                    updateData.escalatedAt = now
                    updateData.escalatedToId = escalateToUserId || ctx.userId
                    break

                case 'REOPEN':
                    updateData.reopenedCount = { increment: 1 }
                    updateData.resolvedAt = null
                    updateData.workflowResolvedAt = null
                    updateData.sourceResolvedAt = null
                    break
            }

            // Apply update
            const updated = await tx.ownerIssue.update({
                where: { id: params.id },
                data: updateData,
            })

            // Create audit event
            await tx.ownerIssueEvent.create({
                data: {
                    ownerIssueId: params.id,
                    eventType,
                    fromStatus: issue.status,
                    toStatus: newStatus || issue.status,
                    actorUserId: ctx.userId,
                    actorName: ctx.userName,
                    note: note || null,
                    meta: Object.keys(eventMeta).length > 0 ? eventMeta : undefined,
                },
            })

            return { newVersion: updated.version }
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error: any) {
        const msg = error?.message || ''
        if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
        if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        if (msg === 'CONFLICT') return NextResponse.json({ error: 'Issue was modified. Refresh and try again.' }, { status: 409 })
        if (msg.startsWith('INVALID:')) return NextResponse.json({ error: msg.replace('INVALID: ', '') }, { status: 400 })
        console.error('[OWNER_ISSUE_ACTION]', error)
        return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 })
    }
}
