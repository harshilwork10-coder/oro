import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// POST - Subscribe to push notifications
export async function POST(req: NextRequest) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
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
                userAgent: req.headers.get('user-agent') || undefined,
            },
            create: {
                userId: user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                deviceName,
                userAgent: req.headers.get('user-agent') || undefined,
            }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[Push] Subscribe error:', error?.message)
        return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { endpoint } = body

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
        }

        await prisma.pushSubscription.deleteMany({
            where: {
                userId: user.id,
                endpoint
            }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[Push] Unsubscribe error:', error?.message)
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }
}

// GET - Get subscription status and VAPID key
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's subscriptions
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId: user.id },
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
