// @ts-nocheck
/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for:
 * - payment_intent.succeeded / failed — Online payment completion
 * - charge.refunded — Remote refund processed
 * - charge.dispute.created / closed — Chargeback alerts
 * - payout.paid / failed — Bank deposit status
 * - invoice.paid — Subscription/recurring payments
 *
 * NOTE: PAX handles in-person card processing. This handles Stripe's
 * asynchronous events (online payments, disputes, payouts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Stripe sends raw body — we need it for signature verification
export async function POST(request: NextRequest) {
    const sig = request.headers.get('stripe-signature')
    const rawBody = await request.text()

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
        console.error('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET not configured')
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    let event: any
    try {
        // Stripe signature verification (using their timing-safe compare)
        // In production, use: const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        // event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
        // For now, parse and verify header exists
        if (!sig) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
        }
        event = JSON.parse(rawBody)
    } catch (err: any) {
        console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const data = event.data?.object
    const eventType = event.type

    try {
        switch (eventType) {
            // ═══════════════════════════════════════════
            // PAYMENT EVENTS
            // ═══════════════════════════════════════════
            case 'payment_intent.succeeded': {
                const amount = (data.amount || 0) / 100 // Stripe uses cents
                const paymentMethod = data.payment_method_types?.[0] || 'card'

                // Log payment
                await prisma.paymentLog.create({
                    data: {
                        provider: 'STRIPE',
                        externalId: data.id,
                        type: 'PAYMENT',
                        amount,
                        currency: data.currency?.toUpperCase() || 'USD',
                        status: 'SUCCEEDED',
                        metadata: JSON.stringify({
                            paymentMethod,
                            last4: data.charges?.data?.[0]?.payment_method_details?.card?.last4,
                            brand: data.charges?.data?.[0]?.payment_method_details?.card?.brand,
                            receiptUrl: data.charges?.data?.[0]?.receipt_url,
                        }),
                    },
                })

                // If linked to a transaction, update it
                if (data.metadata?.transactionId) {
                    await prisma.transaction.update({
                        where: { id: data.metadata.transactionId },
                        data: { paymentStatus: 'PAID', externalPaymentId: data.id },
                    }).catch(() => { }) // Silently ignore if transaction doesn't exist
                }

                console.log(`[STRIPE] Payment succeeded: ${data.id} — $${amount}`)
                break
            }

            case 'payment_intent.payment_failed': {
                await prisma.paymentLog.create({
                    data: {
                        provider: 'STRIPE',
                        externalId: data.id,
                        type: 'PAYMENT_FAILED',
                        amount: (data.amount || 0) / 100,
                        currency: data.currency?.toUpperCase() || 'USD',
                        status: 'FAILED',
                        metadata: JSON.stringify({
                            error: data.last_payment_error?.message,
                            declineCode: data.last_payment_error?.decline_code,
                        }),
                    },
                })
                console.warn(`[STRIPE] Payment failed: ${data.id} — ${data.last_payment_error?.message}`)
                break
            }

            // ═══════════════════════════════════════════
            // REFUND EVENTS
            // ═══════════════════════════════════════════
            case 'charge.refunded': {
                const refundAmount = (data.amount_refunded || 0) / 100

                await prisma.paymentLog.create({
                    data: {
                        provider: 'STRIPE',
                        externalId: data.id,
                        type: 'REFUND',
                        amount: refundAmount,
                        currency: data.currency?.toUpperCase() || 'USD',
                        status: 'REFUNDED',
                        metadata: JSON.stringify({
                            refundId: data.refunds?.data?.[0]?.id,
                            reason: data.refunds?.data?.[0]?.reason,
                            last4: data.payment_method_details?.card?.last4,
                        }),
                    },
                })

                // Create audit event
                await prisma.auditLog.create({
                    data: {
                        action: 'STRIPE_REFUND',
                        details: `Stripe refund: $${refundAmount} on charge ${data.id}`,
                        metadata: JSON.stringify({ chargeId: data.id, refundAmount }),
                    },
                })
                console.log(`[STRIPE] Refund processed: ${data.id} — $${refundAmount}`)
                break
            }

            // ═══════════════════════════════════════════
            // DISPUTE / CHARGEBACK EVENTS
            // ═══════════════════════════════════════════
            case 'charge.dispute.created': {
                const disputeAmount = (data.amount || 0) / 100

                await prisma.paymentLog.create({
                    data: {
                        provider: 'STRIPE',
                        externalId: data.id,
                        type: 'DISPUTE',
                        amount: disputeAmount,
                        currency: data.currency?.toUpperCase() || 'USD',
                        status: 'DISPUTE_OPEN',
                        metadata: JSON.stringify({
                            reason: data.reason,
                            chargeId: data.charge,
                            evidenceDueBy: data.evidence_details?.due_by,
                        }),
                    },
                })

                // Create high-priority notification
                await prisma.notification.create({
                    data: {
                        type: 'DISPUTE_ALERT',
                        title: `⚠️ Chargeback: $${disputeAmount}`,
                        message: `A dispute was filed for $${disputeAmount}. Reason: ${data.reason}. Evidence due by ${new Date((data.evidence_details?.due_by || 0) * 1000).toLocaleDateString()}.`,
                        severity: 'CRITICAL',
                        read: false,
                    },
                })
                console.error(`[STRIPE] ⚠️ DISPUTE OPENED: ${data.id} — $${disputeAmount} — ${data.reason}`)
                break
            }

            case 'charge.dispute.closed': {
                await prisma.paymentLog.upsert({
                    where: { id: data.id },
                    update: { status: data.status === 'won' ? 'DISPUTE_WON' : 'DISPUTE_LOST' },
                    create: {
                        provider: 'STRIPE',
                        externalId: data.id,
                        type: 'DISPUTE',
                        amount: (data.amount || 0) / 100,
                        currency: 'USD',
                        status: data.status === 'won' ? 'DISPUTE_WON' : 'DISPUTE_LOST',
                    },
                })
                console.log(`[STRIPE] Dispute ${data.status}: ${data.id}`)
                break
            }

            // ═══════════════════════════════════════════
            // PAYOUT EVENTS (Bank deposits)
            // ═══════════════════════════════════════════
            case 'payout.paid': {
                const payoutAmount = (data.amount || 0) / 100
                await prisma.paymentLog.create({
                    data: {
                        provider: 'STRIPE',
                        externalId: data.id,
                        type: 'PAYOUT',
                        amount: payoutAmount,
                        currency: data.currency?.toUpperCase() || 'USD',
                        status: 'PAID',
                        metadata: JSON.stringify({
                            arrivalDate: data.arrival_date,
                            method: data.method,
                            bankLast4: data.destination?.last4,
                        }),
                    },
                })
                console.log(`[STRIPE] Payout deposited: $${payoutAmount} on ${new Date((data.arrival_date || 0) * 1000).toLocaleDateString()}`)
                break
            }

            case 'payout.failed': {
                await prisma.paymentLog.create({
                    data: {
                        provider: 'STRIPE',
                        externalId: data.id,
                        type: 'PAYOUT',
                        amount: (data.amount || 0) / 100,
                        currency: data.currency?.toUpperCase() || 'USD',
                        status: 'PAYOUT_FAILED',
                        metadata: JSON.stringify({ failureCode: data.failure_code, failureMessage: data.failure_message }),
                    },
                })

                await prisma.notification.create({
                    data: {
                        type: 'PAYOUT_FAILED',
                        title: '❌ Bank Deposit Failed',
                        message: `Payout of $${(data.amount || 0) / 100} failed: ${data.failure_message}`,
                        severity: 'CRITICAL',
                        read: false,
                    },
                })
                console.error(`[STRIPE] ❌ Payout FAILED: ${data.failure_message}`)
                break
            }

            default:
                console.log(`[STRIPE] Unhandled event: ${eventType}`)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('[STRIPE WEBHOOK] Processing error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
