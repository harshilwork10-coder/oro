import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })



    const { id } = await params
try {
        // Mark notification as read in database
        await prisma.notification.update({
            where: {
                id,
                userId: user.id // Ensure user can only mark their own notifications
            },
            data: { isRead: true, readAt: new Date() }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        // If notification doesn't exist or doesn't belong to user
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
        }
        console.error('[NOTIFICATION_READ]', error)
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
    }
}
