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
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit
    })

    return NextResponse.json({ logs })
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

