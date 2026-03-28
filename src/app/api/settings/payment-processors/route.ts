import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Payment Processor Configuration
 * GET /api/settings/payment-processors — View processor status
 * PUT /api/settings/payment-processors — Update config (Owner+ only)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    const profile = user.locationId ? await prisma.locationPaymentProfile.findFirst({
        where: { locationId: user.locationId }
    }) : null

    return NextResponse.json({
        data: {
            processors: {
                pax: { configured: true, status: 'ACTIVE', description: 'In-person card processing via PAX terminal' },
                stripe: {
                    configured: !!process.env.STRIPE_WEBHOOK_SECRET,
                    webhookUrl: '/api/webhooks/stripe',
                    status: process.env.STRIPE_WEBHOOK_SECRET ? 'ACTIVE' : 'NOT_CONFIGURED',
                    description: 'Online payments, refunds, disputes, payouts'
                },
                square: {
                    configured: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
                    webhookUrl: '/api/webhooks/square',
                    status: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ? 'ACTIVE' : 'NOT_CONFIGURED',
                    description: 'Online payments, disputes, inventory sync'
                }
            },
            paymentProfile: profile
        }
    })
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    try {
        const { processor, config } = await req.json()

        if (!processor || !['STRIPE', 'SQUARE'].includes(processor)) {
            return NextResponse.json({ error: 'Invalid processor. Use STRIPE or SQUARE' }, { status: 400 })
        }

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'PAYMENT_PROCESSOR_CONFIG', entityType: 'PaymentProcessor', entityId: processor,
            details: { processor, changes: Object.keys(config || {}) }
        })

        return NextResponse.json({
            data: {
                message: `${processor} configuration updated. Set environment variables on your server to activate.`,
                requiredEnvVars: processor === 'STRIPE'
                    ? ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
                    : ['SQUARE_ACCESS_TOKEN', 'SQUARE_WEBHOOK_SIGNATURE_KEY', 'SQUARE_WEBHOOK_URL']
            }
        })
    } catch (error: any) {
        console.error('[PAYMENT_PROCESSORS_PUT]', error)
        return NextResponse.json({ error: 'Failed to update payment processor config' }, { status: 500 })
    }
}
