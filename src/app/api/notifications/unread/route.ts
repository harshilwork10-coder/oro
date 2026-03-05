// @ts-nocheck
/**
 * Notifications Unread API
 *
 * GET — Fetch unread notifications (cached by bell component at 60s TTL)
 * PUT — Mark as read / mark all read
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const notifications = await prisma.notification.findMany({
        where: { read: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
    })

    return NextResponse.json({
        data: { notifications, unreadCount: notifications.length },
    })
}

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, markAllRead, read } = await request.json()

    if (markAllRead) {
        await prisma.notification.updateMany({ where: { read: false }, data: { read: true } })
        return NextResponse.json({ data: { message: 'All marked read' } })
    }

    if (id) {
        await prisma.notification.update({ where: { id }, data: { read: read ?? true } })
        return NextResponse.json({ data: { message: 'Updated' } })
    }

    return NextResponse.json({ error: 'Missing id or markAllRead' }, { status: 400 })
}
