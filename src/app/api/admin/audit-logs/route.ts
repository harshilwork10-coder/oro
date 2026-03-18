import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch audit logs for an entity
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'PROVIDER only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') // 'summary' = counts only, null = full logs
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const action = searchParams.get('action')
    const franchiseId = searchParams.get('franchiseId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '500')

    const where: any = {}
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (action && action !== 'ALL') where.action = action

    // Franchise/Store filter - filter by franchiseId in the changes JSON
    if (franchiseId && franchiseId !== 'ALL') {
        where.changes = {
            contains: franchiseId
        }
    }

    // Date range filter
    if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = new Date(dateFrom)
        if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59')
    }

    // Search filter (by email or entityId)
    if (search) {
        where.OR = [
            { userEmail: { contains: search } },
            { entityId: { contains: search } },
            { action: { contains: search } }
        ]
    }

    // SUMMARY MODE: return only action counts (lightweight, no log details)
    if (mode === 'summary') {
        const counts = await prisma.auditLog.groupBy({
            by: ['action'],
            where,
            _count: { action: true }
        })
        const summary = Object.fromEntries(
            counts.map(c => [c.action, c._count.action])
        )
        const total = counts.reduce((sum, c) => sum + c._count.action, 0)
        return NextResponse.json({ summary, total })
    }

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit
    })

    // Parse changes JSON for each log
    const parsedLogs = logs.map(log => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes) : null
    }))

    // Resolve franchise/store names from changes.franchiseId
    const franchiseIds = [...new Set(
        parsedLogs
            .map(l => l.changes?.franchiseId)
            .filter(Boolean)
    )] as string[]

    let franchiseMap: Record<string, string> = {}
    if (franchiseIds.length > 0) {
        const franchises = await prisma.franchise.findMany({
            where: { id: { in: franchiseIds } },
            select: { id: true, name: true }
        })
        franchiseMap = Object.fromEntries(franchises.map(f => [f.id, f.name]))
    }

    // Attach storeName to each log
    const enrichedLogs = parsedLogs.map(log => ({
        ...log,
        storeName: franchiseMap[log.changes?.franchiseId] || null
    }))

    return NextResponse.json({ logs: enrichedLogs })
}

// POST - Create a new audit log entry
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const body = await request.json()

    const { entityType, entityId, action, changes, status = 'SUCCESS' } = body

    const log = await prisma.auditLog.create({
        data: {
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            entityType,
            entityId,
            action,
            changes: changes ? JSON.stringify(changes) : null,
            status,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
    })

    return NextResponse.json({ log })
}

