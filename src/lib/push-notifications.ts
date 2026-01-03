import webpush from 'web-push'

// VAPID keys for Web Push
// These should be generated once and stored as environment variables
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@oronext.com'

// Configure web-push
if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
}

// Notification types with priorities
export type NotificationType =
    | 'VOID_ALERT'        // 🚨 Critical: Void over threshold
    | 'REFUND_ALERT'      // 🚨 Critical: Refund over threshold  
    | 'ID_OVERRIDE'       // 🚨 Critical: Age check skipped
    | 'DRAWER_OPEN'       // ⚠️ High: Drawer open too long
    | 'DAILY_SUMMARY'     // 📊 Daily: End of day sales
    | 'LOW_STOCK'         // 📦 Alert: Low stock on product
    | 'LOTTERY_PAYOUT'    // 💰 Info: Large lottery payout

// Notification templates
const templates: Record<NotificationType, { title: string; icon: string }> = {
    VOID_ALERT: { title: '🚨 Void Alert', icon: '/icons/alert-red.png' },
    REFUND_ALERT: { title: '🚨 Refund Alert', icon: '/icons/alert-red.png' },
    ID_OVERRIDE: { title: '⚠️ ID Override', icon: '/icons/alert-orange.png' },
    DRAWER_OPEN: { title: '⚠️ Drawer Open', icon: '/icons/alert-orange.png' },
    DAILY_SUMMARY: { title: '📊 Daily Summary', icon: '/icons/chart.png' },
    LOW_STOCK: { title: '📦 Low Stock', icon: '/icons/box.png' },
    LOTTERY_PAYOUT: { title: '🎰 Lottery Payout', icon: '/icons/lottery.png' },
}

export interface PushSubscription {
    endpoint: string
    keys: {
        p256dh: string
        auth: string
    }
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
    subscription: PushSubscription,
    type: NotificationType,
    body: string,
    data?: Record<string, any>
) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('[Push] VAPID keys not configured - skipping notification')
        return false
    }

    const template = templates[type]
    const payload = JSON.stringify({
        title: template.title,
        body,
        icon: template.icon,
        badge: '/icons/badge.png',
        tag: type, // Prevents duplicate notifications
        data: { type, url: '/pulse', ...data },
    })

    try {
        await webpush.sendNotification(subscription, payload)
        console.log(`[Push] Sent ${type} notification`)
        return true
    } catch (error: any) {
        console.error('[Push] Failed to send:', error?.message)
        // If subscription is invalid, we should remove it from DB
        if (error?.statusCode === 410 || error?.statusCode === 404) {
            console.log('[Push] Subscription expired - should remove from DB')
        }
        return false
    }
}

/**
 * Send notification to all subscriptions for a user
 */
export async function notifyUser(
    userId: string,
    type: NotificationType,
    body: string,
    data?: Record<string, any>
) {
    // Import prisma here to avoid circular dependencies
    const { prisma } = await import('@/lib/prisma')

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
    })

    if (subscriptions.length === 0) {
        console.log(`[Push] No subscriptions for user ${userId}`)
        return 0
    }

    let sent = 0
    for (const sub of subscriptions) {
        const success = await sendPushNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            type,
            body,
            data
        )
        if (success) sent++
    }

    return sent
}

/**
 * Notify all owners of a franchise about an event
 */
export async function notifyFranchiseOwners(
    franchiseId: string,
    type: NotificationType,
    body: string,
    data?: Record<string, any>
) {
    const { prisma } = await import('@/lib/prisma')

    // Find the franchise and its franchisor owner
    const franchise = await prisma.franchise.findUnique({
        where: { id: franchiseId },
        include: {
            franchisor: {
                include: { owner: true }
            }
        }
    })

    if (!franchise?.franchisor?.owner) {
        console.log(`[Push] No owner found for franchise ${franchiseId}`)
        return 0
    }

    return notifyUser(franchise.franchisor.owner.id, type, body, data)
}

// Export VAPID public key for client-side subscription
export function getVapidPublicKey() {
    return vapidPublicKey
}
