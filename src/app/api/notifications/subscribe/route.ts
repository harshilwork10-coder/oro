import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { subscription, deviceName } = body

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
        }

        // Upsert subscription (update if endpoint exists, create if not)
        await prisma.pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                deviceName,
                userAgent: request.headers.get('user-agent') || undefined,
            },
            create: {
                userId: session.user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                deviceName,
                userAgent: request.headers.get('user-agent') || undefined,
            }
        })

        console.log(`[Push] Subscribed user ${session.user.id} on device: ${deviceName || 'Unknown'}`)

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[Push] Subscribe error:', error?.message)
        return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { endpoint } = body

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
        }

        await prisma.pushSubscription.deleteMany({
            where: {
                userId: session.user.id,
                endpoint
            }
        })

        console.log(`[Push] Unsubscribed user ${session.user.id}`)

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[Push] Unsubscribe error:', error?.message)
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }
}

// GET - Get subscription status and VAPID key
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's subscriptions
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId: session.user.id },
            select: { id: true, deviceName: true, createdAt: true }
        })

        return NextResponse.json({
            vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
            subscriptions,
            isSubscribed: subscriptions.length > 0
        })

    } catch (error: any) {
        console.error('[Push] Status error:', error?.message)
        return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
    }
}
