import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import {
    calculateTransactionPayouts,
    getBusinessDate,
    DEFAULT_PAYOUT_CONFIG
} from '@/lib/payoutEngine'
import { computePromotionsSafe } from '@/lib/pos/promotionEngine'
import { resolveTransactionLocation } from '@/lib/transactions/locationResolver'
import { z } from 'zod'

// Shared type for queue sync result
interface SyncResult {
    offlineId: string
    status: 'synced' | 'skipped_duplicate' | 'rejected' | 'retryable_error'
    errorText?: string // Clear reason code/message
    transactionId?: string
    invoiceNumber?: string
}

// Validation schema for an incoming offline transaction from Web POS
const offlineTxSchema = z.object({
    offlineId: z.string().uuid(), // Used as idempotency key
    items: z.array(z.object({
        id: z.string().optional(),
        type: z.enum(['SERVICE', 'PRODUCT']),
        name: z.string(),
        price: z.number(), // The price the client *thinks* they charged
        quantity: z.number().min(1),
        discount: z.number().optional().default(0),
        barberId: z.string().optional().nullable(),
    })).min(1),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'SPLIT', 'GIFT_CARD', 'EBT']),
    customerId: z.string().optional().nullable(),
    createdAt: z.string().datetime(), // ISO timestamp
    stationId: z.string().optional().nullable(),
    cashDrawerSessionId: z.string().optional().nullable(),
    tip: z.number().optional().default(0),
    source: z.literal('OFFLINE_WEB_POS'), // Differentiate from ANDROID_POS
})

const batchSyncSchema = z.object({
    transactions: z.array(offlineTxSchema)
})

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const parsed = batchSyncSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ 
                error: 'Invalid payload', 
                details: parsed.error.format() 
            }, { status: 400 })
        }

        const { transactions } = parsed.data
        const results: SyncResult[] = []

        // SPRINT 1 SETTINGS
        const settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId },
            select: { taxRate: true }
        })
        const taxRate = Number(settings?.taxRate || 0)

        // Get location ID early since it's needed for stock adjustment
        const locationId = user.locationId || user.franchiseId // Fallback to franchiseId if not set

        for (const tx of transactions) {
            // ==========================================
            // 1. IDEMPOTENCY CHECK
            // ==========================================
            // Look up by offlineId to prevent double-logging
            const invoiceNum = `OFF-${tx.offlineId.substring(0, 12)}`
            const existing = await prisma.transaction.findFirst({
                where: {
                    franchiseId: user.franchiseId,
                    invoiceNumber: invoiceNum
                }
            })

            if (existing) {
                results.push({
                    offlineId: tx.offlineId,
                    status: 'skipped_duplicate',
                    transactionId: existing.id,
                    invoiceNumber: existing.invoiceNumber || undefined
                })
                continue
            }

            // ==========================================
            // 2. SPRINT 1 POLICY: RESTRICTIONS
            // ==========================================
            if (tx.paymentMethod !== 'CASH') {
                results.push({
                    offlineId: tx.offlineId,
                    status: 'rejected',
                    errorText: `Sprint 1 offline sync only supports CASH. Received: ${tx.paymentMethod}`
                })
                continue
            }

            const productIds = tx.items.filter(i => i.type === 'PRODUCT' && i.id).map(i => i.id!)

            let dbProducts: any[] = []
            if (productIds.length > 0) {
                dbProducts = await prisma.product.findMany({
                    where: { id: { in: productIds } },
                    include: { productCategory: { select: { ageRestricted: true } } }
                })
            }
            const productMap = new Map(dbProducts.map(p => [p.id, p]))

            // Age Restriction Guard
            const ageRestricted = tx.items.some(i => {
                if (i.type !== 'PRODUCT' || !i.id) return false
                const p = productMap.get(i.id)
                return p?.ageRestricted || p?.productCategory?.ageRestricted
            })

            if (ageRestricted) {
                results.push({
                    offlineId: tx.offlineId,
                    status: 'rejected',
                    errorText: `Sprint 1 offline sync rejects age-restricted items.`
                })
                continue
            }

            // ==========================================
            // 3. SERVER-OWNED RECOMPUTATION
            // ==========================================
            let serverSubtotal = 0
            const finalItemsForPromo = []

            for (const item of tx.items) {
                const p = productMap.get(item.id!)
                const serverPrice = p ? Number(p.price) : item.price // Fallback to client price if not found
                const itemSub = serverPrice * item.quantity
                const discountAmt = itemSub * (item.discount / 100)
                serverSubtotal += (itemSub - discountAmt)

                if (item.id) {
                    finalItemsForPromo.push({
                        id: item.id,
                        categoryId: p?.categoryId,
                        price: serverPrice,
                        quantity: item.quantity
                    })
                }
            }

            // Recompute promotions safely. Fallback to zero promos on failure.
            const promoResult = await computePromotionsSafe({
                franchiseId: user.franchiseId,
                cartItems: finalItemsForPromo,
                promoCode: null // Sprint 1: No promo codes offline
            })

            const serverComputedSubtotal = serverSubtotal - promoResult.totalPromoDiscount
            const serverComputedTax = serverComputedSubtotal * taxRate
            const serverComputedTotal = serverComputedSubtotal + serverComputedTax

            // ==========================================
            // 4. ATOMIC INSERT & STOCK ADJUSTMENT
            // ==========================================
            try {
                const transaction = await prisma.$transaction(async (db) => {
                    const userComp = await db.compensationPlan.findFirst({
                        where: { userId: user.id, effectiveTo: null },
                        orderBy: { effectiveFrom: 'desc' }
                    })
                    const payoutConfig = { ...DEFAULT_PAYOUT_CONFIG, commissionSplit: Number(userComp?.commissionSplit || 0), taxRate }
                    
                    const lineItemInputs = tx.items.map(item => {
                        const p = productMap.get(item.id!)
                        return {
                            type: item.type,
                            price: p ? Number(p.price) : item.price,
                            quantity: item.quantity,
                            discount: item.discount,
                            productId: item.type === 'PRODUCT' ? item.id! : null,
                            productName: item.type === 'PRODUCT' ? (p?.name || item.name) : null,
                            serviceId: item.type === 'SERVICE' ? (item.id! && !item.id!.startsWith('open') ? item.id! : null) : null,
                            serviceName: item.type === 'SERVICE' ? item.name : null,
                            barberId: item.barberId || null
                        }
                    })

                    const payoutResult = calculateTransactionPayouts(lineItemInputs, tx.tip, payoutConfig, getBusinessDate())

                    const { locationId: resolvedLocationId, stationId: resolvedStationId } = await resolveTransactionLocation({
                        franchiseId: user.franchiseId,
                        employeeId: user.id,
                        stationId: tx.stationId || undefined,
                        cashDrawerSessionId: tx.cashDrawerSessionId || undefined,
                    })

                    const newTx = await db.transaction.create({
                        data: {
                            franchiseId: user.franchiseId,
                            locationId: resolvedLocationId,
                            stationId: resolvedStationId,
                            invoiceNumber: invoiceNum,
                            employeeId: user.id,
                            clientId: tx.customerId || null,
                            subtotal: serverComputedSubtotal.toString(),
                            tax: serverComputedTax.toString(),
                            total: serverComputedTotal.toString(),
                            tip: tx.tip.toString(),
                            paymentMethod: 'CASH',
                            cashAmount: serverComputedTotal.toString(),
                            cardAmount: '0',
                            status: 'COMPLETED',
                            source: 'OFFLINE_WEB_POS',
                            cashDrawerSessionId: tx.cashDrawerSessionId || null,
                            createdAt: new Date(tx.createdAt), // IMPORTANT: use original timestamp
                            appliedPromotions: promoResult.appliedPromotions.length > 0 ? JSON.stringify(promoResult.appliedPromotions) : null,
                            promoDiscount: promoResult.totalPromoDiscount > 0 ? promoResult.totalPromoDiscount.toString() : null,
                            lineItems: {
                                create: tx.items.map((item, index) => {
                                    const snapshot = payoutResult.lineItemSnapshots[index]
                                    const p = productMap.get(item.id!)
                                    const serverPrice = p ? Number(p.price) : item.price
                                    
                                    const promoData = item.id ? promoResult.linePromoMap.get(item.id) : null

                                    return {
                                        type: item.type,
                                        productId: item.type === 'PRODUCT' ? (item.id && !item.id.startsWith('open') ? item.id : null) : null,
                                        serviceId: item.type === 'SERVICE' ? (item.id && !item.id.startsWith('open') ? item.id : null) : null,
                                        quantity: item.quantity,
                                        price: serverPrice.toString(),
                                        discount: item.discount.toString(),
                                        total: (serverPrice * item.quantity).toString(),
                                        cashUnitPrice: serverPrice.toString(),
                                        cardUnitPrice: null,
                                        cashLineTotal: (serverPrice * item.quantity).toString(),
                                        cardLineTotal: null,
                                        lineChargedMode: 'CASH',
                                        serviceNameSnapshot: item.type === 'SERVICE' ? item.name : null,
                                        productNameSnapshot: item.type === 'PRODUCT' ? (p?.name || item.name) : null,
                                        priceCharged: snapshot.priceCharged.toString(),
                                        discountAllocated: snapshot.discountAllocated.toString(),
                                        taxAllocated: snapshot.taxAllocated.toString(),
                                        tipAllocated: snapshot.tipAllocated.toString(),
                                        commissionSplitUsed: snapshot.commissionSplitUsed.toString(),
                                        commissionAmount: snapshot.commissionAmount.toString(),
                                        ownerAmount: snapshot.ownerAmount.toString(),
                                        businessDate: snapshot.businessDate,
                                        lineItemStatus: snapshot.lineItemStatus,
                                        promotionId: promoData?.promotionId,
                                        promotionName: promoData?.promotionName,
                                        promotionDiscount: promoData?.promotionDiscount?.toString(),
                                    }
                                })
                            }
                        }
                    })

                    // Handle Stock Adjustment
                    // Notice we don't throw an error if stock goes negative. We let the sale process.
                    for (const item of tx.items) {
                        if (item.type === 'PRODUCT' && item.id && !item.id.startsWith('open') && !item.id.startsWith('custom')) {
                            const p = productMap.get(item.id)
                            if (p && p.stock !== null) {
                                await db.product.update({
                                    where: { id: item.id },
                                    data: { stock: { decrement: item.quantity } }
                                })
                                await db.stockAdjustment.create({
                                    data: {
                                        productId: item.id,
                                        locationId: locationId!,
                                        quantity: -item.quantity,
                                        reason: 'SALE',
                                        sourceId: newTx.id, // transaction ID
                                        performedBy: user.id,
                                        previousStock: p.stock,
                                        newStock: p.stock - item.quantity,
                                    }
                                })
                            }
                        }
                    }

                    return newTx
                })

                results.push({
                    offlineId: tx.offlineId,
                    status: 'synced',
                    transactionId: transaction.id,
                    invoiceNumber: transaction.invoiceNumber || undefined
                })

            } catch (err: any) {
                console.error(`[SYNC] Record fail for offlineId ${tx.offlineId}:`, err)
                results.push({
                    offlineId: tx.offlineId,
                    status: 'retryable_error',
                    errorText: err.message
                })
            }
        }

        return NextResponse.json({ results })

    } catch (e: any) {
        console.error('[SYNC] Batch failure', e)
        return NextResponse.json({ error: 'Internal failure' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                invoiceNumber: { startsWith: 'OFF-' },
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            },
            select: {
                id: true,
                invoiceNumber: true,
                total: true,
                status: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json({
            transactions: recentTransactions,
            syncedCount: recentTransactions.length,
            lastSyncCheck: new Date().toISOString()
        })
    } catch (error) {
        console.error('[SYNC] Status check failed:', error)
        return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
    }
}
