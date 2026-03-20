// @ts-nocheck
/**
 * Square Webhook Handler
 *
 * Handles Square webhook events for:
 * - payment.completed / updated — Online/in-app payment status
 * - refund.created / updated — Refund processing
 * - dispute.created / state.changed — Chargeback lifecycle
 * - payout.sent — Bank deposit completed
 * - inventory.count.updated — Stock sync from Square catalog
 *
 * NOTE: PAX handles in-person card processing. This handles Square's
 * asynchronous events for locations using Square as their processor.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    const rawBody = await request.text()
    const signature = request.headers.get('x-square-hmacsha256-signature')

    // Verify webhook signature
    const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    if (!webhookSignatureKey) {
        console.error('[SQUARE WEBHOOK] SQUARE_WEBHOOK_SIGNATURE_KEY not configured')
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Square HMAC-SHA256 verification
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL || ''
    const payload = notificationUrl + rawBody
    const expectedSig = crypto.createHmac('sha256', webhookSignatureKey).update(payload).digest('base64')

    if (signature !== expectedSig) {
        console.error('[SQUARE WEBHOOK] Signature verification failed')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let event: any
    try {
        event = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const eventType = event.type
    const data = event.data?.object

    try {
        switch (eventType) {
            // ═══════════════════════════════════════════
            // PAYMENT EVENTS
            // ═══════════════════════════════════════════
            case 'payment.completed': {
                const payment = data?.payment
                if (!payment) break

                const amount = (payment.total_money?.amount || 0) / 100 // Square uses cents
                const currency = payment.total_money?.currency || 'USD'

                await prisma.paymentLog.create({
                    data: {
                        provider: 'SQUARE',
                        externalId: payment.id,
                        type: 'PAYMENT',
                        amount,
                        currency,
                        status: 'SUCCEEDED',
                        metadata: JSON.stringify({
                            orderId: payment.order_id,
                            locationId: payment.location_id,
                            sourceType: payment.source_type,
                            last4: payment.card_details?.card?.last_4,
                            brand: payment.card_details?.card?.card_brand,
                            entryMethod: payment.card_details?.entry_method,
                            receiptUrl: payment.receipt_url,
                        }),
                    },
                })

                // Link to our transaction if possible
                if (payment.reference_id) {
                    await prisma.transaction.update({
                        where: { id: payment.reference_id },
                        data: { paymentStatus: 'PAID', externalPaymentId: payment.id },
                    }).catch(() => { })
                }

                console.log(`[SQUARE] Payment completed: ${payment.id} — $${amount}`)
                break
            }

            case 'payment.updated': {
                const payment = data?.payment
                if (!payment) break

                // Update existing payment log
                const existing = await prisma.paymentLog.findFirst({
                    where: { externalId: payment.id, provider: 'SQUARE' }
                })
                if (existing) {
                    await prisma.paymentLog.update({
                        where: { id: existing.id },
                        data: {
                            status: payment.status === 'COMPLETED' ? 'SUCCEEDED' :
                                payment.status === 'FAILED' ? 'FAILED' :
                                    payment.status === 'CANCELED' ? 'CANCELLED' : payment.status,
                        },
                    })
                }
                console.log(`[SQUARE] Payment updated: ${payment.id} — ${payment.status}`)
                break
            }

            // ═══════════════════════════════════════════
            // REFUND EVENTS
            // ═══════════════════════════════════════════
            case 'refund.created':
            case 'refund.updated': {
                const refund = data?.refund
                if (!refund) break

                const refundAmount = (refund.amount_money?.amount || 0) / 100

                await prisma.paymentLog.upsert({
                    where: { id: refund.id },
                    update: {
                        status: refund.status === 'COMPLETED' ? 'REFUNDED' :
                            refund.status === 'PENDING' ? 'REFUND_PENDING' : refund.status,
                    },
                    create: {
                        provider: 'SQUARE',
                        externalId: refund.id,
                        type: 'REFUND',
                        amount: refundAmount,
                        currency: refund.amount_money?.currency || 'USD',
                        status: refund.status === 'COMPLETED' ? 'REFUNDED' : 'REFUND_PENDING',
                        metadata: JSON.stringify({
                            paymentId: refund.payment_id,
                            reason: refund.reason,
                            locationId: refund.location_id,
                        }),
                    },
                })

                if (refund.status === 'COMPLETED') {
                    await prisma.auditLog.create({
                        data: {
                            action: 'SQUARE_REFUND',
                            details: `Square refund: $${refundAmount} — ${refund.reason || 'No reason'}`,
                            metadata: JSON.stringify({ refundId: refund.id, paymentId: refund.payment_id }),
                        },
                    })
                }

                console.log(`[SQUARE] Refund ${refund.status}: ${refund.id} — $${refundAmount}`)
                break
            }

            // ═══════════════════════════════════════════
            // DISPUTE / CHARGEBACK EVENTS
            // ═══════════════════════════════════════════
            case 'dispute.created': {
                const dispute = data?.dispute
                if (!dispute) break

                const disputeAmount = (dispute.amount_money?.amount || 0) / 100

                await prisma.paymentLog.create({
                    data: {
                        provider: 'SQUARE',
                        externalId: dispute.id,
                        type: 'DISPUTE',
                        amount: disputeAmount,
                        currency: dispute.amount_money?.currency || 'USD',
                        status: 'DISPUTE_OPEN',
                        metadata: JSON.stringify({
                            reason: dispute.reason,
                            state: dispute.state,
                            paymentId: dispute.payment_id,
                            dueAt: dispute.due_at,
                            cardBrand: dispute.card_brand,
                        }),
                    },
                })

                await prisma.notification.create({
                    data: {
                        type: 'DISPUTE_ALERT',
                        title: `⚠️ Square Dispute: $${disputeAmount}`,
                        message: `Chargeback for $${disputeAmount}. Reason: ${dispute.reason}. Evidence due: ${dispute.due_at}.`,
                        severity: 'CRITICAL',
                        read: false,
                    },
                })

                console.error(`[SQUARE] ⚠️ DISPUTE OPENED: ${dispute.id} — $${disputeAmount} — ${dispute.reason}`)
                break
            }

            case 'dispute.state.changed': {
                const dispute = data?.dispute
                if (!dispute) break

                const existing = await prisma.paymentLog.findFirst({
                    where: { externalId: dispute.id, provider: 'SQUARE' }
                })
                if (existing) {
                    await prisma.paymentLog.update({
                        where: { id: existing.id },
                        data: {
                            status: dispute.state === 'WON' ? 'DISPUTE_WON' :
                                dispute.state === 'LOST' ? 'DISPUTE_LOST' :
                                    dispute.state === 'ACCEPTED' ? 'DISPUTE_LOST' : 'DISPUTE_OPEN',
                        },
                    })
                }
                console.log(`[SQUARE] Dispute state changed: ${dispute.id} → ${dispute.state}`)
                break
            }

            // ═══════════════════════════════════════════
            // PAYOUT EVENTS (Bank deposits)
            // ═══════════════════════════════════════════
            case 'payout.sent': {
                const payout = data?.payout
                if (!payout) break

                const payoutAmount = (payout.amount_money?.amount || 0) / 100

                await prisma.paymentLog.create({
                    data: {
                        provider: 'SQUARE',
                        externalId: payout.id,
                        type: 'PAYOUT',
                        amount: payoutAmount,
                        currency: payout.amount_money?.currency || 'USD',
                        status: 'PAID',
                        metadata: JSON.stringify({
                            arrivalDate: payout.arrival_date,
                            type: payout.type,
                            locationId: payout.location_id,
                        }),
                    },
                })
                console.log(`[SQUARE] Payout sent: $${payoutAmount} — arrives ${payout.arrival_date}`)
                break
            }

            // ═══════════════════════════════════════════
            // INVENTORY SYNC
            // ═══════════════════════════════════════════
            case 'inventory.count.updated': {
                const changes = data?.inventory_counts || []
                for (const change of changes) {
                    console.log(`[SQUARE] Inventory updated: ${change.catalog_object_id} → ${change.quantity} at ${change.location_id}`)
                    // Could sync to our StockOnHand if Square catalog is source of truth
                }
                break
            }

            default:
                console.log(`[SQUARE] Unhandled event: ${eventType}`)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('[SQUARE WEBHOOK] Processing error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
