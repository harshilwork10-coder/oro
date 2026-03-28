import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Notifications — Unread notifications + mark read */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const notifications = await prisma.notification.findMany({ where: { read: false }, orderBy: { createdAt: 'desc' }, take: 20 })
        return NextResponse.json({ data: { notifications, unreadCount: notifications.length } })
    } catch (error: any) { console.error('[NOTIFICATIONS_UNREAD_GET]', error); return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 }) }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const { id, markAllRead, read } = await req.json()
        if (markAllRead) { await prisma.notification.updateMany({ where: { read: false }, data: { read: true } }); return NextResponse.json({ data: { message: 'All marked read' } }) }
        if (id) { await prisma.notification.update({ where: { id }, data: { read: read ?? true } }); return NextResponse.json({ data: { message: 'Updated' } }) }
        return NextResponse.json({ error: 'Missing id or markAllRead' }, { status: 400 })
    } catch (error: any) { console.error('[NOTIFICATIONS_UNREAD_PUT]', error); return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 }) }
}
