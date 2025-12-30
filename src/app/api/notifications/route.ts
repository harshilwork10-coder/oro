import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get notifications for current user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { searchParams } = new URL(request.url)
        const unreadOnly = searchParams.get('unread') === 'true'
        const limit = parseInt(searchParams.get('limit') || '20')

        const notifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { userId: user.id },
                    { franchiseId: user.franchiseId, userId: null } // Broadcast notifications
                ],
                ...(unreadOnly ? { isRead: false } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        })

        const unreadCount = await prisma.notification.count({
            where: {
                OR: [
                    { userId: user.id },
                    { franchiseId: user.franchiseId, userId: null }
                ],
                isRead: false
            }
        })

        return NextResponse.json({
            notifications,
            unreadCount
        })

    } catch (error) {
        console.error('[NOTIFICATIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
}

// POST: Create a new notification (internal use / triggers)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        // Only managers+ can create notifications
        if (!['PROVIDER', 'FRANCHISOR', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { type, title, message, targetUserId, data } = await request.json()

        if (!type || !title || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const notification = await prisma.notification.create({
            data: {
                franchiseId: user.franchiseId,
                userId: targetUserId || null,
                type,
                title,
                message,
                data: data ? JSON.stringify(data) : null
            }
        })

        return NextResponse.json({ notification })

    } catch (error) {
        console.error('[NOTIFICATIONS_POST]', error)
        return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { notificationId, markAllRead } = await request.json()

        if (markAllRead) {
            // Mark all unread notifications as read
            await prisma.notification.updateMany({
                where: {
                    OR: [
                        { userId: user.id },
                        { franchiseId: user.franchiseId, userId: null }
                    ],
                    isRead: false
                },
                data: {
                    isRead: true,
                    readAt: new Date()
                }
            })
            return NextResponse.json({ success: true, message: 'All notifications marked as read' })
        }

        if (!notificationId) {
            return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 })
        }

        // Mark single notification as read
        const notification = await prisma.notification.updateMany({
            where: {
                id: notificationId,
                OR: [
                    { userId: user.id },
                    { franchiseId: user.franchiseId, userId: null }
                ]
            },
            data: {
                isRead: true,
                readAt: new Date()
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[NOTIFICATIONS_PATCH]', error)
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }
}

