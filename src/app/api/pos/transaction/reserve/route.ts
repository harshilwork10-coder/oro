import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'
import { checkStockAvailable } from '@/lib/inventory/stock-guard'
import { checkIdempotency, storeIdempotencyKey, getIdempotencyKey } from '@/lib/api/idempotency'
import { z } from 'zod'
import { unauthorizedResponse, badRequestResponse, validateBody } from '@/lib/validation'
import { computePromotionsSafe } from '@/lib/pos/promotionEngine'

/**
 * Sprint 1: Reserve Transaction (Phase 1 of card checkout)
 * POST /api/pos/transaction/reserve
 *
 * Creates a PendingTransaction with an immutable server-validated cart/pricing snapshot.
 * This is called BEFORE the PAX payment is sent.
 *
 * Flow:
 *   1. Client sends cart items + payment intent
 *   2. Server validates prices against Product DB, runs stock guard, age session, promo engine
 *   3. Server creates PendingTransaction with sealed snapshots
 *   4. Returns { pendingTransactionId, expectedTotal, expiresAt }
 *   5. Client sends PAX command for expectedTotal
 *   6. Client calls POST /api/pos/transaction/finalize with pendingId + PAX response
 *
 * This route does NOT:
 *   - Create a Transaction row
 *   - Decrement stock
 *   - Consume the age session
 *   - Charge any money
 *
 * PendingTransaction expires after 15 minutes. If not finalized, it goes to EXPIRED.
 */

const PENDING_TX_TTL_MS = 15 * 60 * 1000 // 15 minutes

// ── Request Schema ──
// Accepts only what's necessary to validate and snapshot the cart.
// Client pricing fields are accepted for the snapshot but server recomputes authoritatively.
const reserveRequestSchema = z.object({
    items: z.array(z.object({
        id: z.string().optional(),
        type: z.enum(['SERVICE', 'PRODUCT']),
        name: z.string(),
        price: z.union([z.number(), z.string()]).transform(v => Number(v)),
        cashPrice: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
        cardPrice: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
        quantity: z.union([z.number(), z.string()]).transform(v => Number(v)).refine(v => v > 0, { message: 'Quantity must be greater than 0' }),
        discount: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),
        barberId: z.string().optional().nullable(),
        itemDescription: z.string().optional().nullable(),
    })).min(1, 'At least one item required'),

    paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD']), // Reserve is card-only
    tip: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),

    // Context
    clientId: z.string().optional().nullable(),
    cashDrawerSessionId: z.string().optional().nullable(),
    stationId: z.string().optional().nullable(),
    loyaltyPhone: z.string().optional().nullable(),
    source: z.enum(['WEB_POS', 'ANDROID_POS', 'API']).optional().default('WEB_POS'),

    // Sprint 1: Server-issued age verification session
    ageVerificationSessionId: z.string().optional().nullable(),

    // Sprint 1: Promo code for server-side validation
    promoCode: z.string().optional().nullable(),

    // Sprint 1: Idempotency
    idempotencyKey: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return unauthorizedResponse()
    }

    const validation = await validateBody(req, reserveRequestSchema)
    if ('error' in validation) return validation.error

    const {
        items, paymentMethod, tip,
        clientId, cashDrawerSessionId, stationId, loyaltyPhone, source,
        ageVerificationSessionId, promoCode,
    } = validation.data

    // ===== IDEMPOTENCY CHECK =====
    const idempotencyKey = validation.data.idempotencyKey || getIdempotencyKey(req)
    if (idempotencyKey) {
        const idempotencyResult = await checkIdempotency(idempotencyKey, user.franchiseId)
        if (idempotencyResult.isDuplicate) {
            return NextResponse.json(idempotencyResult.cachedResponse)
        }
    }

    try {
        // ===== LOAD DB PRODUCT TRUTH =====
        // Product is the CANONICAL retail inventory model
        const productIds = items
            .filter(i => i.type === 'PRODUCT' && i.id && !i.id.startsWith('custom') && !i.id.startsWith('open'))
            .map(i => i.id!)

        const serviceIds = items
            .filter(i => i.type === 'SERVICE' && i.id && !i.id.startsWith('custom') && !i.id.startsWith('open'))
            .map(i => i.id!)

        const [dbProducts, dbServices] = await Promise.all([
            productIds.length > 0 ? prisma.product.findMany({
                where: { id: { in: productIds } },
                include: {
                    productCategory: {
                        select: { id: true, name: true, ageRestricted: true, minimumAge: true }
                    }
                }
            }) : [],
            serviceIds.length > 0 ? prisma.service.findMany({ where: { id: { in: serviceIds } } }) : []
        ])

        const productMap = new Map(dbProducts.map(p => [p.id, p]))
        const serviceMap = new Map(dbServices.map(s => [s.id, s]))

        // ===== AGE VERIFICATION ENFORCEMENT =====
        const restrictedItems = items.filter(item => {
            if (!item.id || item.id.startsWith('custom') || item.id.startsWith('open')) return false
            if (item.type !== 'PRODUCT') return false
            const product = productMap.get(item.id)
            if (!product) return false
            return product.ageRestricted || product.productCategory?.ageRestricted
        })

        let ageSessionId: string | null = null
        if (restrictedItems.length > 0) {
            if (!ageVerificationSessionId) {
                return badRequestResponse(
                    `Age verification required. ${restrictedItems.length} restricted item(s) in cart. Complete verification before checkout.`
                )
            }

            const session = await prisma.ageVerificationSession.findFirst({
                where: {
                    id: ageVerificationSessionId,
                    franchiseId: user.franchiseId,
                    verified: true,
                    consumed: false,
                    expiresAt: { gt: new Date() },
                }
            })

            if (!session) {
                return badRequestResponse(
                    'Age verification session expired, consumed, or invalid. Re-verify customer ID.'
                )
            }

            const maxRequiredAge = Math.max(
                ...restrictedItems.map(item => {
                    const product = productMap.get(item.id!)
                    const productAge = product?.minimumAge || 0
                    const categoryAge = product?.productCategory?.minimumAge || 0
                    return Math.max(productAge, categoryAge) || 21
                })
            )

            if (session.minimumAge < maxRequiredAge) {
                return badRequestResponse(
                    `Age verification was for ${session.minimumAge}+ but cart requires ${maxRequiredAge}+. Re-verify.`
                )
            }

            ageSessionId = session.id
        }

        // ===== PRICE VALIDATION =====
        // Build server-authoritative cart snapshot with DB prices
        const cartSnapshot: Array<{
            id: string | null
            type: string
            name: string
            dbPrice: number         // Server-resolved price
            clientPrice: number     // What client sent (for audit)
            cashPrice: number
            cardPrice: number | null
            quantity: number
            discount: number        // Percentage discount
            lineTotal: number       // After discount, before tax
            categoryId: string | null
            categoryName: string | null
            ageRestricted: boolean
            barberId: string | null
            itemDescription: string | null
            isGlobal: boolean
        }> = []

        for (const item of items) {
            let dbPrice = item.price
            let cashPrice = item.price
            let cardPrice: number | null = null
            let categoryId: string | null = null
            let categoryName: string | null = null
            let ageRestricted = false
            let isGlobal = false

            if (item.id && !item.id.startsWith('custom') && !item.id.startsWith('open')) {
                if (item.type === 'PRODUCT') {
                    const product = productMap.get(item.id)
                    if (!product) {
                        return badRequestResponse(`Product not found: ${item.name} (${item.id})`)
                    }
                    dbPrice = product.cashPrice ? Number(product.cashPrice) : Number(product.price)
                    cashPrice = dbPrice
                    cardPrice = product.cardPrice ? Number(product.cardPrice) : null
                    categoryId = product.categoryId || null
                    categoryName = product.productCategory?.name || null
                    ageRestricted = product.ageRestricted || product.productCategory?.ageRestricted || false

                    // Price manipulation check
                    if (Math.abs(item.price - dbPrice) > 0.05) {
                        console.error(`[RESERVE] Price manipulation: ${item.name}. Client: ${item.price}, DB: ${dbPrice}`)
                        return badRequestResponse(`Price mismatch for ${item.name}. Please refresh menu.`)
                    }
                } else if (item.type === 'SERVICE') {
                    const service = serviceMap.get(item.id)
                    if (service) {
                        dbPrice = Number(service.price)
                        cashPrice = dbPrice
                        if (Math.abs(item.price - dbPrice) > 0.05) {
                            return badRequestResponse(`Price mismatch for ${item.name}. Please refresh menu.`)
                        }
                    } else {
                        // Deleted service or GlobalService — allow with client price
                        console.warn(`[RESERVE] Service deleted or global: ${item.name} (${item.id}). Using client price.`)
                        isGlobal = true
                    }
                }
            }

            // Discount validation for employees
            if (item.discount > 0 && user.role === 'EMPLOYEE') {
                const employee = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { canApplyDiscounts: true, maxDiscountPercent: true, maxDiscountAmount: true }
                })
                if (!employee?.canApplyDiscounts) {
                    return badRequestResponse('Permission Denied: You are not authorized to apply discounts.')
                }
                if (employee.maxDiscountPercent > 0 && item.discount > employee.maxDiscountPercent) {
                    return badRequestResponse(`Discount (${item.discount}%) exceeds your limit of ${employee.maxDiscountPercent}%.`)
                }
                if (Number(employee.maxDiscountAmount) > 0) {
                    const discAmt = dbPrice * item.quantity * (item.discount / 100)
                    if (discAmt > Number(employee.maxDiscountAmount)) {
                        return badRequestResponse(`Discount amount ($${discAmt.toFixed(2)}) exceeds your limit of $${Number(employee.maxDiscountAmount).toFixed(2)}.`)
                    }
                }
            }

            const itemSubtotal = dbPrice * item.quantity
            const discountAmount = itemSubtotal * (item.discount / 100)
            const lineTotal = itemSubtotal - discountAmount

            cartSnapshot.push({
                id: item.id || null,
                type: item.type,
                name: item.name,
                dbPrice,
                clientPrice: item.price,
                cashPrice,
                cardPrice,
                quantity: item.quantity,
                discount: item.discount,
                lineTotal: Math.round(lineTotal * 100) / 100,
                categoryId,
                categoryName,
                ageRestricted,
                barberId: item.barberId || null,
                itemDescription: item.itemDescription || null,
                isGlobal
            })
        }

        // ===== STOCK GUARD =====
        for (const snapItem of cartSnapshot) {
            if (snapItem.type === 'PRODUCT' && snapItem.id && !snapItem.id.startsWith('custom') && !snapItem.id.startsWith('open')) {
                const product = productMap.get(snapItem.id)
                if (product && product.stock !== null && product.stock !== undefined) {
                    const stockCheck = await checkStockAvailable(snapItem.id, snapItem.quantity, user.franchiseId)
                    if (!stockCheck.allowed) {
                        return badRequestResponse(`Stock unavailable: ${snapItem.name}. ${stockCheck.error}`)
                    }
                }
            }
        }

        // ===== SERVER-SIDE PROMOTION COMPUTATION =====
        // Delegated to the shared promotion engine (src/lib/pos/promotionEngine.ts).
        // Failure policy: checkout continues with zero promos (safe wrapper).
        const promoResult = await computePromotionsSafe({
            franchiseId: user.franchiseId,
            cartItems: cartSnapshot
                .filter(i => i.id && !i.id.startsWith('custom') && !i.id.startsWith('open'))
                .map(i => ({
                    id: i.id!,
                    categoryId: i.categoryId || undefined,
                    price: i.dbPrice, // SERVER price, not client
                    quantity: i.quantity,
                })),
            promoCode: promoCode || null,
        })
        const serverPromos = promoResult.appliedPromotions
        const serverPromoDiscount = promoResult.totalPromoDiscount
        // ===== END SERVER-SIDE PROMOTION COMPUTATION =====

        // ===== COMPUTE SERVER TOTALS =====
        const chargedMode = 'CARD' // Reserve is always for card payments

        const serverSubtotal = cartSnapshot.reduce((sum, i) => sum + i.lineTotal, 0)
        const adjustedSubtotal = Math.max(0, serverSubtotal - serverPromoDiscount)

        // TODO: Use actual tax rate from franchise/location config
        // For now, use the client-implied tax rate as a reasonable approximation
        const clientSubtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0)
        const clientTax = validation.data.tip !== undefined ? 0 : 0 // Can't derive; zero is placeholder
        // We'll snapshot the server subtotal and let finalize compute tax from config

        const totalsSnapshot = {
            subtotal: Math.round(serverSubtotal * 100) / 100,
            promoDiscount: serverPromoDiscount,
            adjustedSubtotal: Math.round(adjustedSubtotal * 100) / 100,
            tip: tip || 0,
            chargedMode,
            // These are server-computed from DB prices
            serverItemCount: cartSnapshot.length,
            serverUnitCount: cartSnapshot.reduce((s, i) => s + i.quantity, 0),
        }

        const expectedTotal = Math.round((adjustedSubtotal + (tip || 0)) * 100) / 100

        // ===== CREATE PENDING TRANSACTION =====
        const expiresAt = new Date(Date.now() + PENDING_TX_TTL_MS)

        const pendingTx = await prisma.pendingTransaction.create({
            data: {
                franchiseId: user.franchiseId,
                employeeId: user.id,
                cartSnapshot: JSON.stringify(cartSnapshot),
                totalsSnapshot: JSON.stringify(totalsSnapshot),
                promoSnapshot: serverPromos.length > 0 ? JSON.stringify(serverPromos) : null,
                paymentMethod,
                expectedTotal: expectedTotal.toString(),
                status: 'RESERVED',
                stationId: stationId || null,
                clientId: clientId || null,
                tip: (tip || 0).toString(),
                cashDrawerSessionId: cashDrawerSessionId || null,
                ageVerificationSessionId: ageSessionId,
                loyaltyPhone: loyaltyPhone || null,
                chargedMode,
                idempotencyKey: idempotencyKey || null,
                expiresAt,
            }
        })

        // ===== AUDIT LOG =====
        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'TRANSACTION_RESERVED',
            entityType: 'PendingTransaction', entityId: pendingTx.id,
            details: {
                paymentMethod,
                expectedTotal,
                itemCount: cartSnapshot.length,
                unitCount: totalsSnapshot.serverUnitCount,
                promoCount: serverPromos.length,
                promoDiscount: serverPromoDiscount,
                ageSessionAttached: !!ageSessionId,
                expiresAt: expiresAt.toISOString(),
                source,
            }
        })

        // ===== STORE IDEMPOTENCY KEY =====
        if (idempotencyKey) {
            await storeIdempotencyKey(idempotencyKey, user.franchiseId, {
                pendingTransactionId: pendingTx.id,
                expectedTotal,
                expiresAt: expiresAt.toISOString(),
            })
        }

        // ===== RESPONSE =====
        // Return only the identifiers the frontend needs for PAX + finalize
        return NextResponse.json({
            pendingTransactionId: pendingTx.id,
            expectedTotal,
            expiresAt: expiresAt.toISOString(),
            paymentMethod,
            chargedMode,
            // Server promo summary (for frontend display only — not authoritative for finalize)
            appliedPromotions: serverPromos.map(p => ({
                promotionId: p.promotionId,
                promotionName: p.promotionName,
                discountAmount: p.discountAmount,
            })),
            totalPromoDiscount: serverPromoDiscount,
            // Metadata
            itemCount: cartSnapshot.length,
            ageSessionAttached: !!ageSessionId,
            status: 'RESERVED',
        })

    } catch (error: any) {
        console.error('[RESERVE_TRANSACTION]', error.code, error.message, error.meta)
        return NextResponse.json({
            error: 'Failed to reserve transaction. Please try again.',
            debug: {
                code: error.code || 'UNKNOWN',
                message: error.message?.slice(0, 300) || 'No message',
            }
        }, { status: 500 })
    }
}
