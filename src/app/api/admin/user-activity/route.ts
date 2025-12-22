import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch user activity log for an account/franchise
// PROVIDER can see all activity for any client
// This is for legal protection - see exactly what users did
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
    const franchisorId = searchParams.get('franchisorId')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    // Build query
    const where: any = {}

    if (userId) {
        where.userId = userId
    }

    if (action) {
        where.action = action
    }

    // If franchisorId provided, get all users under that franchisor and filter by them
    let userIds: string[] = []
    if (franchisorId) {
        // Get all franchises under this franchisor
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId },
            select: { id: true }
        })
        const franchiseIds = franchises.map((f: { id: string }) => f.id)

        // Get all users under these franchises
        const users = await prisma.user.findMany({
            where: { franchiseId: { in: franchiseIds } },
            select: { id: true }
        })
        userIds = users.map((u: { id: string }) => u.id)

        if (userIds.length > 0) {
            where.userId = { in: userIds }
        }
    }

    // Get total count
    const total = await prisma.auditLog.count({ where })

    // Get logs with pagination
    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
    })

    // Parse changes JSON
    const parsedLogs = logs.map((log: any) => {
        let changes = null
        try {
            changes = log.changes ? JSON.parse(log.changes) : null
        } catch { }
        return { ...log, changes }
    })

    return NextResponse.json({
        logs: parsedLogs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    })
}
