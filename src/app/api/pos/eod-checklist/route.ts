import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/pos/eod-checklist — Complete end-of-day checklist
 * GET /api/pos/eod-checklist — Get default checklist + today's completion
 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
        const body = await request.json()
        const { items, notes } = body as {
            items: { task: string; completed: boolean; notes?: string }[]
            notes?: string
        }

        if (!items?.length) return NextResponse.json({ error: 'Checklist items required' }, { status: 400 })

        await prisma.auditEvent.create({
            data: {
                locationId,
                franchiseId: user.franchiseId,
                employeeId: user.id,
                employeeName: user.email,
                eventType: 'EOD_CHECKLIST',
                severity: 'LOW',
                details: JSON.stringify({
                    completedBy: user.email,
                    completedAt: new Date(),
                    items, notes,
                    allDone: items.every(i => i.completed)
                })
            }
        })

        return NextResponse.json({
            completed: items.every(i => i.completed),
            totalTasks: items.length,
            doneTasks: items.filter(i => i.completed).length
        })
    } catch (error: any) {
        console.error('[EOD_CHECKLIST_POST]', error)
        return NextResponse.json({ error: 'Failed to save checklist' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
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

        const today = new Date(); today.setHours(0, 0, 0, 0)
        const todayCompletion = await prisma.auditEvent.findFirst({
            where: { locationId, eventType: 'EOD_CHECKLIST', createdAt: { gte: today } },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            checklist: defaultChecklist,
            todayCompleted: todayCompletion?.details ? JSON.parse(todayCompletion.details) : null
        })
    } catch (error: any) {
        console.error('[EOD_CHECKLIST_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
    }
}
