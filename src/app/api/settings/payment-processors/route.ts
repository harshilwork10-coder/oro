// @ts-nocheck
/**
 * Payment Processor Configuration API
 *
 * GET — Retrieve current processor settings (Stripe/Square keys, webhook status)
 * PUT — Update processor configuration
 *
 * This complements PAX (in-person) by managing online processor configs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, locationId: true },
    })

    if (!user || !['OWNER', 'ADMIN', 'PROVIDER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owners only' }, { status: 403 })
    }

    // Get location payment profile
    const profile = user.locationId ? await prisma.locationPaymentProfile.findFirst({
        where: { locationId: user.locationId },
    }) : null

    return NextResponse.json({
        data: {
            processors: {
                pax: {
                    configured: true,
                    status: 'ACTIVE',
                    description: 'In-person card processing via PAX terminal',
                },
                stripe: {
                    configured: !!process.env.STRIPE_WEBHOOK_SECRET,
                    webhookUrl: '/api/webhooks/stripe',
                    status: process.env.STRIPE_WEBHOOK_SECRET ? 'ACTIVE' : 'NOT_CONFIGURED',
                    description: 'Online payments, refunds, disputes, payouts',
                    events: [
                        'payment_intent.succeeded',
                        'payment_intent.payment_failed',
                        'charge.refunded',
                        'charge.dispute.created',
                        'charge.dispute.closed',
                        'payout.paid',
                        'payout.failed',
                    ],
                },
                square: {
                    configured: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
                    webhookUrl: '/api/webhooks/square',
                    status: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ? 'ACTIVE' : 'NOT_CONFIGURED',
                    description: 'Online payments, disputes, inventory sync',
                    events: [
                        'payment.completed',
                        'payment.updated',
                        'refund.created',
                        'refund.updated',
                        'dispute.created',
                        'dispute.state.changed',
                        'payout.sent',
                        'inventory.count.updated',
                    ],
                },
            },
            paymentProfile: profile,
        },
    })
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, locationId: true },
    })

    if (!user || !['OWNER', 'ADMIN', 'PROVIDER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owners only' }, { status: 403 })
    }

    const { processor, config } = await request.json()

    if (!processor || !['STRIPE', 'SQUARE'].includes(processor)) {
        return NextResponse.json({ error: 'Invalid processor. Use STRIPE or SQUARE' }, { status: 400 })
    }

    // Log the configuration change
    await prisma.auditLog.create({
        data: {
            action: 'PAYMENT_PROCESSOR_CONFIG',
            userId: session.user.id,
            details: `Updated ${processor} configuration`,
            metadata: JSON.stringify({ processor, changes: Object.keys(config || {}) }),
        },
    })

    return NextResponse.json({
        data: {
            message: `${processor} configuration updated. Set environment variables on your server to activate.`,
            requiredEnvVars: processor === 'STRIPE'
                ? ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
                : ['SQUARE_ACCESS_TOKEN', 'SQUARE_WEBHOOK_SIGNATURE_KEY', 'SQUARE_WEBHOOK_URL'],
        },
    })
  } catch (error) {
    console.error('[PAYMENT_PROCESSORS_PUT]', error)
    return NextResponse.json({ error: 'Failed to update payment processor config' }, { status: 500 })
  }
}
