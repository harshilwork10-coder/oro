'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Complete (or update) an end-of-day checklist
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { items, notes } = body as {
            items: { task: string; completed: boolean; notes?: string }[]
            notes?: string
        }

        if (!items?.length) return ApiResponse.badRequest('Checklist items required')

        // Store as audit event
        await (prisma as any).auditEvent.create({
            data: {
                locationId,
                userId: user.id,
                type: 'EOD_CHECKLIST',
                data: JSON.stringify({
                    completedBy: user.name || user.email,
                    completedAt: new Date(),
                    items,
                    notes,
                    allDone: items.every(i => i.completed)
                })
            }
        })

        return ApiResponse.success({
            completed: items.every(i => i.completed),
            totalTasks: items.length,
            doneTasks: items.filter(i => i.completed).length
        })
    } catch (error) {
        console.error('[EOD_CHECKLIST_POST]', error)
        return ApiResponse.error('Failed to save checklist')
    }
}

// GET — Get default checklist + today's completion status
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        // Default retail EOD checklist
        const defaultChecklist = [
            { task: 'Count all cash drawers', category: 'CASH' },
            { task: 'Record safe count', category: 'CASH' },
            { task: 'Prepare bank deposit', category: 'CASH' },
            { task: 'Review all voids/refunds', category: 'REVIEW' },
            { task: 'Review no-sale drawer opens', category: 'REVIEW' },
            { task: 'Check expiring items', category: 'INVENTORY' },
            { task: 'Restock shelves', category: 'INVENTORY' },
            { task: 'Check low stock items', category: 'INVENTORY' },
            { task: 'Clean POS terminals', category: 'STORE' },
            { task: 'Lock up / set alarm', category: 'STORE' }
        ]

        // Check if today's checklist was already completed
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const todayCompletion = await (prisma as any).auditEvent.findFirst({
            where: {
                locationId,
                type: 'EOD_CHECKLIST',
                createdAt: { gte: today }
            },
            orderBy: { createdAt: 'desc' }
        })

        return ApiResponse.success({
            checklist: defaultChecklist,
            todayCompleted: todayCompletion ? JSON.parse(todayCompletion.data) : null
        })
    } catch (error) {
        console.error('[EOD_CHECKLIST_GET]', error)
        return ApiResponse.error('Failed to fetch checklist')
    }
}
