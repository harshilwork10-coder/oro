import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextResponse, NextRequest } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/invoice'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { checkStockAvailable } from '@/lib/inventory/stock-guard'
import { checkIdempotency, storeIdempotencyKey, getIdempotencyKey } from '@/lib/api/idempotency'
import { z } from 'zod'
import {
    calculateTransactionPayouts,
    getBusinessDate,
    DEFAULT_PAYOUT_CONFIG,
    type LineItemInput
} from '@/lib/payoutEngine'
import { validateBody, unauthorizedResponse, badRequestResponse } from '@/lib/validation'
import { computePromotionsSafe } from '@/lib/pos/promotionEngine'
import fs from 'fs'
import path from 'path'

// ============ SPRINT 1: HARDENED REQUEST SCHEMA ============
// Key changes:
// - REMOVED: item-level promotionId (server computes promotions, not client)
// - ADDED: ageVerificationSessionId (server-issued session token for age-restricted items)
// - ADDED: promoCode (optional — client can submit a promo code for server-side validation)
// - ADDED: source (track WEB_POS vs ANDROID_POS vs OFFLINE_WEB_POS)
const transactionRequestSchema = z.object({
    items: z.array(z.object({
        id: z.string().optional(),
        type: z.enum(['SERVICE', 'PRODUCT']),
        name: z.string(),
        price: z.union([z.number(), z.string()]).transform(v => Number(v)),
        // Dual pricing line item fields
        cashPrice: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
        cardPrice: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
        quantity: z.union([z.number(), z.string()]).transform(v => Number(v)).refine(v => v > 0, { message: 'Quantity must be greater than 0' }),
        discount: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),
        barberId: z.string().optional().nullable(), // ID of barber who performed the service
        // Sprint 1: promotionId REMOVED from client input — server computes promotions
        itemDescription: z.string().optional().nullable(), // S4-5: Custom description for open ring items
    })).min(1, 'At least one item required'),
    subtotal: z.union([z.number(), z.string()]).transform(v => Number(v)),
    tax: z.union([z.number(), z.string()]).transform(v => Number(v)),
    total: z.union([z.number(), z.string()]).transform(v => Number(v)),
    // Dual pricing totals
    subtotalCash: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
    subtotalCard: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
    taxCash: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
    taxCard: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
    totalCash: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
    totalCard: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
    paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'SPLIT', 'GIFT_CARD', 'EBT']),
    cashDrawerSessionId: z.string().optional().nullable(),
    clientId: z.string().optional().nullable(),
    cashAmount: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),
    cardAmount: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),
    gatewayTxId: z.string().optional().nullable(),
    authCode: z.string().optional().nullable(),
    cardLast4: z.string().optional().nullable(),
    cardType: z.string().optional().nullable(),
    tip: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),
    notes: z.string().optional().nullable(), // Transaction notes from cashier
    // Sprint 1: Server-issued age verification session (replaces client-trusted booleans)
    ageVerificationSessionId: z.string().optional().nullable(),
    // Sprint 1: Promo code for server-side validation (server recomputes promos, not client)
    promoCode: z.string().optional().nullable(),
    // Sprint 1: Loyalty ID for loyalty-gated promos
    loyaltyId: z.string().optional().nullable(),
    // Sprint 1: Source tracking
    source: z.enum(['WEB_POS', 'ANDROID_POS', 'OFFLINE_WEB_POS', 'API']).optional().default('WEB_POS'),
})

export async function POST(req: NextRequest) {
    // Support both session (web) and Bearer token (mobile)
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return unauthorizedResponse()
    }


    // Validate request body
    const validation = await validateBody(req, transactionRequestSchema)
    if ('error' in validation) return validation.error

    const { items, subtotal, tax, total, subtotalCash, subtotalCard, taxCash, taxCard, totalCash, totalCard, paymentMethod, cashDrawerSessionId, clientId, cashAmount, cardAmount, gatewayTxId, authCode, cardLast4, cardType, tip, notes } = validation.data

    // Shift validation (OWNER-CONTROLLED via BusinessConfig.shiftRequirement setting)
    // Look up through franchise -> franchisor -> businessConfig
    // NONE or no config = No shift required, allow transactions without shift
    // CLOCK_IN_ONLY, CASH_COUNT_ONLY, BOTH = Require open shift
    // ALSO: Check if THIS USER has requiresTimeClock=false (per-employee bypass)

    // First check if this specific user requires time clock
    const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { requiresTimeClock: true, role: true }
    })

    // Owners/Franchisors never require shift
    const isOwnerOrAbove = ['OWNER', 'FRANCHISOR', 'PROVIDER', 'ADMIN'].includes(userRecord?.role || user.role)
    // Employee-level bypass if owner set requiresTimeClock=false for this user
    const userBypassesShift = userRecord?.requiresTimeClock === false

    const franchiseRecord = await prisma.franchise.findUnique({
        where: { id: user.franchiseId },
        select: { franchisorId: true }
    })

    const businessConfig = await prisma.businessConfig.findFirst({
        where: { franchisorId: franchiseRecord?.franchisorId },
        select: { shiftRequirement: true }
    })
    const shiftRequirement = businessConfig?.shiftRequirement || 'NONE'

    if (!isOwnerOrAbove && !userBypassesShift && shiftRequirement !== 'NONE') {
        const needsClockIn = shiftRequirement === 'CLOCK_IN_ONLY' || shiftRequirement === 'BOTH'
        const needsShift = shiftRequirement === 'CASH_COUNT_ONLY' || shiftRequirement === 'BOTH'

        if (needsClockIn) {
            const activePunch = await prisma.timeEntry.findFirst({
                where: { employeeId: user.id, clockOut: null },
                orderBy: { clockIn: 'desc' }
            })
            if (!activePunch) {
                return unauthorizedResponse('Clock-in required to process transactions based on system policy.')
            }
        }

        if (needsShift) {
            const activeShift = await prisma.cashDrawerSession.findFirst({
                where: { franchiseId: user.franchiseId, status: 'OPEN' },
                orderBy: { openedAt: 'desc' }
            })
            if (!activeShift) {
                return unauthorizedResponse('Open cash drawer required to process transactions based on system policy.')
            }
        }
    }

    // Determine chargedMode based on payment method
    // CASH payment = use cash prices, CARD payment = use card prices
    const chargedMode = paymentMethod === 'CASH' ? 'CASH' : 'CARD'

    // ===== IDEMPOTENCY CHECK =====
    // Prevents duplicate transaction processing (double-charge protection)
    const idempotencyKey = getIdempotencyKey(req)
    if (idempotencyKey) {
        const idempotencyResult = await checkIdempotency(idempotencyKey, user.franchiseId)
        if (idempotencyResult.isDuplicate) {
            return NextResponse.json(idempotencyResult.cachedResponse)
        }
    }
    // ===== END IDEMPOTENCY CHECK =====

    // Sprint 1: Extract new fields from validated data
    const { ageVerificationSessionId, promoCode, loyaltyId, source: txSource } = validation.data

    // ===== SPRINT 1: TENDER ROUTING GUARD =====
    // Card payments MUST go through the two-phase reserve/finalize flow.
    // The direct route handles: CASH, GIFT_CARD, EBT, SPLIT (cash+card already captured).
    //
    // LEGACY EXCEPTION: If a client sends CREDIT_CARD/DEBIT_CARD WITH gatewayTxId already
    // present (PAX already approved before this API call), we allow the single-pass legacy
    // path. This supports:
    //   - Android POS (native PAX SDK captures card before calling this API)
    //   - Any client that has not yet migrated to reserve/finalize
    //
    // Once all clients migrate, remove the legacy exception and reject all direct card requests.
    const isCardPayment = ['CREDIT_CARD', 'DEBIT_CARD'].includes(paymentMethod)
    if (isCardPayment && !gatewayTxId) {
        // Card payment WITHOUT prior PAX approval — must use reserve/finalize
        return badRequestResponse(
            'Card payments must use the two-phase checkout flow. ' +
            'Call POST /api/pos/transaction/reserve first, then POST /api/pos/transaction/finalize after PAX approval. ' +
            'Direct card submission is only allowed with a gatewayTxId from a prior PAX approval (legacy path).'
        )
    }
    const isLegacyCardPath = isCardPayment && !!gatewayTxId
    // ===== END TENDER ROUTING GUARD =====

    try {

        // Validate split payment
        if (paymentMethod === 'SPLIT') {
            const splitTotal = (cashAmount || 0) + (cardAmount || 0)
            if (Math.abs(splitTotal - total) > 0.01) {
                return badRequestResponse(`Split payment amounts ($${cashAmount} cash + $${cardAmount} card) must equal total ($${total})`)
            }
        }

        // Generate sequential invoice number
        const invoiceNumber = await generateInvoiceNumber(user.franchiseId)

        // Ensure numeric values are converted to strings for Prisma Decimal type
        const transactionData = {
            invoiceNumber,
            franchiseId: user.franchiseId,
            employeeId: user.id,
            clientId: clientId || null,
            subtotal: subtotal.toString(),
            tax: tax.toString(),
            total: total.toString(),
            // === DUAL PRICING TOTALS (NEVER null after transaction) ===
            // If dual pricing values not provided, default to standard totals
            subtotalCash: (subtotalCash ?? subtotal).toString(),
            subtotalCard: (subtotalCard ?? subtotal).toString(),
            taxCash: (taxCash ?? tax).toString(),
            taxCard: (taxCard ?? tax).toString(),
            totalCash: (totalCash ?? total).toString(),
            totalCard: (totalCard ?? total).toString(),
            chargedMode: chargedMode || 'CASH', // Default to CASH if not specified
            paymentMethod: paymentMethod,
            cashAmount: (paymentMethod === 'SPLIT' ? cashAmount : (paymentMethod === 'CASH' ? total : 0)).toString(),
            cardAmount: (paymentMethod === 'SPLIT' ? cardAmount : (['CREDIT_CARD', 'DEBIT_CARD', 'EBT'].includes(paymentMethod) ? total : 0)).toString(),
            gatewayTxId: gatewayTxId || null,
            authCode: authCode || null,
            cardLast4: cardLast4 || null,
            cardType: cardType || null,
            tip: (tip || 0).toString(),
            status: 'COMPLETED',
            cashDrawerSessionId: cashDrawerSessionId || null,
            // Sprint 1: Server-computed fields (initialized here, updated after promo computation)
            appliedPromotions: null as string | null,
            promoDiscount: null as string | null,
            ageVerificationSessionId: null as string | null,
            source: (txSource || 'WEB_POS') as string,
            lineItems: await (async () => {
                // ===== PAYOUT ENGINE SNAPSHOT CALCULATION =====
                // Generate immutable snapshot fields for reporting accuracy
                const businessDate = getBusinessDate()

                // ===== FETCH EMPLOYEE'S ACTUAL COMMISSION RATE =====
                // Look up the employee's CompensationPlan to get their configured commission split.
                // If no plan exists, commission defaults to 0% — owner must explicitly configure.
                const employeeCompPlan = await prisma.compensationPlan.findFirst({
                    where: { userId: user.id, effectiveTo: null },
                    orderBy: { effectiveFrom: 'desc' },
                    select: { commissionSplit: true }
                })
                const actualCommissionSplit = employeeCompPlan?.commissionSplit
                    ? Number(employeeCompPlan.commissionSplit)
                    : 0 // No plan = no commission (was previously hardcoded 40%)

                const payoutConfig: typeof DEFAULT_PAYOUT_CONFIG = {
                    ...DEFAULT_PAYOUT_CONFIG,
                    commissionSplit: actualCommissionSplit,
                    taxRate: 0 // TODO: Pass actual tax rate
                }

                // Prepare line item inputs for payout engine
                const lineItemInputs: LineItemInput[] = items.map((item: any) => ({
                    type: item.type as 'SERVICE' | 'PRODUCT',
                    price: Number(item.price),
                    quantity: Number(item.quantity),
                    discount: Number(item.discount || 0),
                    serviceId: item.type === 'SERVICE' ? item.id : null,
                    serviceName: item.type === 'SERVICE' ? item.name : null,
                    productId: item.type === 'PRODUCT' ? item.id : null,
                    productName: item.type === 'PRODUCT' ? item.name : null,
                    barberId: item.barberId || null
                }))

                // Calculate payouts using central engine with ACTUAL employee commission rate
                const payoutResult = calculateTransactionPayouts(
                    lineItemInputs,
                    Number(tip || 0),
                    payoutConfig,
                    businessDate
                )

                // Create line items with snapshot fields
                return {
                    create: items.map((item: any, index: number) => {
                        const snapshot = payoutResult.lineItemSnapshots[index]
                        const itemSubtotal = item.price * item.quantity
                        const discountAmount = itemSubtotal * ((item.discount || 0) / 100)
                        const itemTotal = itemSubtotal - discountAmount

                        // === HARD GUARD: Resolve item name (MUST never be null) ===
                        const resolvedName =
                            snapshot.serviceNameSnapshot ||
                            snapshot.productNameSnapshot ||
                            item.name

                        if (!resolvedName) {
                            throw new Error(`Item at index ${index} has no name. Cannot create transaction.`)
                        }

                        // Dual Pricing line item fields
                        const cashUnitPrice = item.cashPrice !== undefined ? Number(item.cashPrice) : Number(item.price)
                        const cardUnitPrice = item.cardPrice !== undefined ? Number(item.cardPrice) : null
                        const cashLineTotal = cashUnitPrice * Number(item.quantity)
                        const cardLineTotal = cardUnitPrice !== null ? cardUnitPrice * Number(item.quantity) : null

                        const lineItemData = {
                            type: item.type,
                            // Only set IDs if they are valid CUIDs (real database records) AND exist locally
                            serviceId: (item.type === 'SERVICE' && item.id && !item.id.startsWith('s') && !item.id.startsWith('custom') && !item.id.startsWith('open') && serviceMap.has(item.id)) ? item.id : null,
                            productId: (item.type === 'PRODUCT' && item.id && !item.id.startsWith('p') && !item.id.startsWith('custom') && !item.id.startsWith('open') && productMap.has(item.id)) ? item.id : null,
                            staffId: item.barberId || null,
                            quantity: parseInt(item.quantity.toString()),
                            price: item.price.toString(),
                            discount: (item.discount || 0).toString(),
                            total: itemTotal.toString(),
                            // Dual Pricing Line Fields
                            cashUnitPrice: cashUnitPrice.toString(),
                            cardUnitPrice: cardUnitPrice !== null ? cardUnitPrice.toString() : null,
                            cashLineTotal: cashLineTotal.toString(),
                            cardLineTotal: cardLineTotal !== null ? cardLineTotal.toString() : null,
                            lineChargedMode: chargedMode, // "CASH" or "CARD"
                            // === SNAPSHOT FIELDS (immutable after checkout) ===
                            // Store name in correct field based on type (NEVER null)
                            serviceNameSnapshot: item.type === 'SERVICE' ? resolvedName : null,
                            productNameSnapshot: item.type === 'PRODUCT' ? resolvedName : null,
                            priceCharged: snapshot.priceCharged.toString(),
                            discountAllocated: snapshot.discountAllocated.toString(),
                            taxAllocated: snapshot.taxAllocated.toString(),
                            tipAllocated: snapshot.tipAllocated.toString(),
                            commissionSplitUsed: snapshot.commissionSplitUsed.toString(),
                            commissionAmount: snapshot.commissionAmount.toString(),
                            ownerAmount: snapshot.ownerAmount.toString(),
                            businessDate: snapshot.businessDate,
                            lineItemStatus: snapshot.lineItemStatus
                        }

                        return lineItemData
                    })
                }
            })()
        }

        // ===== SECURITY: VALIDATE PRICES & STOCK =====
        // Fetch authoritative data to prevent client-side price manipulation
        // Sprint 1: Product is the CANONICAL retail inventory model
        const productIds = items
            .filter((i: any) => i.type === 'PRODUCT' && i.id && !i.id.startsWith('custom') && !i.id.startsWith('open'))
            .map((i: any) => i.id)

        const serviceIds = items
            .filter((i: any) => i.type === 'SERVICE' && i.id && !i.id.startsWith('custom') && !i.id.startsWith('open'))
            .map((i: any) => i.id)

        // Sprint 1: Fetch products WITH category age restriction data
        const [dbProducts, dbServices] = await Promise.all([
            productIds.length > 0 ? prisma.product.findMany({
                where: { id: { in: productIds } },
                include: {
                    productCategory: {
                        select: { id: true, ageRestricted: true, minimumAge: true }
                    }
                }
            }) : [],
            serviceIds.length > 0 ? prisma.service.findMany({ where: { id: { in: serviceIds } } }) : []
        ])

        const productMap = new Map(dbProducts.map(p => [p.id, p]))
        const serviceMap = new Map(dbServices.map(s => [s.id, s]))

        // ===== SPRINT 1: AGE VERIFICATION ENFORCEMENT =====
        // Server-side check — NEVER trusts client booleans. Queries AgeVerificationSession table.
        // One session covers all restricted items if the verified age meets the strictest requirement.
        const restrictedItems = items.filter(item => {
            if (!item.id || item.id.startsWith('custom') || item.id.startsWith('open')) return false
            if (item.type !== 'PRODUCT') return false
            const product = productMap.get(item.id!)
            if (!product) return false
            return product.ageRestricted || product.productCategory?.ageRestricted
        })

        let ageSession: { id: string; minimumAge: number } | null = null
        if (restrictedItems.length > 0) {
            if (!ageVerificationSessionId) {
                return badRequestResponse(
                    `Age verification required. ${restrictedItems.length} item(s) in cart require ID check. Complete verification before checkout.`
                )
            }

            // Fetch the server-issued session — this is the ONLY proof we accept
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
                    'Age verification session expired, consumed, or invalid. Please re-verify customer ID before checkout.'
                )
            }

            // Check the strictest age requirement across all restricted items
            const maxRequiredAge = Math.max(
                ...restrictedItems.map(item => {
                    const product = productMap.get(item.id!)
                    const productAge = product?.minimumAge || 0
                    const categoryAge = product?.productCategory?.minimumAge || 0
                    return Math.max(productAge, categoryAge) || 21 // Default to 21 if no age specified
                })
            )

            if (session.minimumAge < maxRequiredAge) {
                return badRequestResponse(
                    `Age verification was for ${session.minimumAge}+ but cart contains items requiring ${maxRequiredAge}+. Re-verify with correct age threshold.`
                )
            }

            ageSession = { id: session.id, minimumAge: session.minimumAge }
        }
        // ===== END AGE VERIFICATION ENFORCEMENT =====

        // Validate each item price against DB truth
        for (const item of items) {
            if (item.id && !item.id.startsWith('custom') && !item.id.startsWith('open')) {
                let dbPrice = 0

                if (item.type === 'PRODUCT') {
                    const product = productMap.get(item.id)
                    if (!product) {
                        return badRequestResponse(`Product not found: ${item.name} (${item.id})`)
                    }
                    // Use cashPrice if available (dual pricing), otherwise legacy price
                    dbPrice = product.cashPrice ? Number(product.cashPrice) : Number(product.price)
                } else if (item.type === 'SERVICE') {
                    const service = serviceMap.get(item.id)
                    if (!service) {
                        // Service was in the POS menu cache but has since been deleted from catalog.
                        // Allow the sale to proceed — the cashier already added it when it was valid.
                        console.warn(`[POS_TRANSACTION] Service deleted from catalog but still in POS cache: ${item.name} (${item.id}). Allowing sale with client price $${item.price}.`)
                        continue
                    }
                    dbPrice = Number(service.price)
                }

                // Sprint 1: Server computes promotions — no client promotionId to skip validation
                // Price Validation: Reject if client price differs from DB by more than $0.05
                if (Math.abs(item.price - dbPrice) > 0.05) {
                    console.error(`[SECURITY] Price manipulation detected for ${item.name}. Client: ${item.price}, DB: ${dbPrice}`)
                    return badRequestResponse(`Price mismatch for ${item.name}. Please refresh menu.`)
                }

                // Employee Permission Check for MANUAL discounts
                if (item.discount > 0 && user.role === 'EMPLOYEE') {
                    const employee = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { canApplyDiscounts: true, maxDiscountPercent: true, maxDiscountAmount: true }
                    })

                    if (!employee || !employee.canApplyDiscounts) {
                        return badRequestResponse(`Permission Denied: You are not authorized to apply discounts.`)
                    }

                    if (employee.maxDiscountPercent > 0 && item.discount > employee.maxDiscountPercent) {
                        return badRequestResponse(`Permission Denied: Discount (${item.discount}%) exceeds your limit of ${employee.maxDiscountPercent}%.`)
                    }

                    if (Number(employee.maxDiscountAmount) > 0) {
                        const originalTotal = dbPrice * item.quantity
                        const discountAmount = originalTotal * (item.discount / 100)
                        if (discountAmount > Number(employee.maxDiscountAmount)) {
                            return badRequestResponse(`Permission Denied: Discount amount ($${discountAmount.toFixed(2)}) exceeds your limit of $${Number(employee.maxDiscountAmount).toFixed(2)}.`)
                        }
                    }
                }
            }
        }
        // ===== END SECURITY CHECK =====

        // ===== SPRINT 1: STOCK POLICY =====
        // STOCK CHECK happens here (before the atomic block).
        // STOCK DECREMENT happens inside the atomic block.
        //
        // Policy for direct route (CASH / LEGACY CARD):
        //   - Stock is checked AND decremented in the same request.
        //   - No gap between check and decrement (single-pass).
        //   - This is safe because there's no PAX wait between.
        //
        // Policy for two-phase reserve/finalize:
        //   - Stock is checked at RESERVE time (in reserve/route.ts).
        //   - Stock is decremented at FINALIZE time (in finalize/route.ts).
        //   - There IS a gap (15-min max). A product could sell out between reserve and finalize.
        //   - Finalize does NOT recheck stock — the PAX card is already approved.
        //   - If stock went negative, the sale still completes. This is intentional:
        //     we do not void an approved card charge over a stock race condition.
        //   - The StockAdjustment audit trail records the true stock movement.
        //   - Negative stock is flagged in reporting/drift detection.
        // =====
        for (const item of items) {
            if (item.type === 'PRODUCT' && item.id && !item.id.startsWith('custom') && !item.id.startsWith('open')) {
                const product = productMap.get(item.id)
                if (product && product.stock !== null && product.stock !== undefined) {
                    const stockCheck = await checkStockAvailable(item.id, item.quantity, user.franchiseId)
                    if (!stockCheck.allowed) {
                        return badRequestResponse(`Stock unavailable: ${item.name}. ${stockCheck.error}`)
                    }
                }
            }
        }
        // ===== END STOCK GUARD CHECK =====

        // ===== SPRINT 1: SERVER-SIDE PROMOTION COMPUTATION =====
        // Delegated to the shared promotion engine (src/lib/pos/promotionEngine.ts).
        // Failure policy: checkout continues with zero promos (safe wrapper).
        const promoResult = await computePromotionsSafe({
            franchiseId: user.franchiseId,
            cartItems: items
                .filter(i => i.id && !i.id.startsWith('custom') && !i.id.startsWith('open'))
                .map(i => {
                    const product = productMap.get(i.id!)
                    const dbPrice = product
                        ? (product.cashPrice ? Number(product.cashPrice) : Number(product.price))
                        : i.price
                    return {
                        id: i.id!,
                        categoryId: product?.categoryId || undefined,
                        price: dbPrice,
                        quantity: i.quantity,
                    }
                }),
            promoCode: promoCode || null,
        })
        const serverPromos = promoResult.appliedPromotions
        const serverPromoDiscount = promoResult.totalPromoDiscount
        const linePromoMap = promoResult.linePromoMap
        // ===== END SERVER-SIDE PROMOTION COMPUTATION =====

        // ===== SPRINT 1: INJECT SERVER-COMPUTED PROMO FIELDS INTO transactionData =====
        transactionData.appliedPromotions = serverPromos.length > 0 ? JSON.stringify(serverPromos) : null
        transactionData.promoDiscount = serverPromoDiscount > 0 ? serverPromoDiscount.toString() : null
        transactionData.ageVerificationSessionId = ageSession?.id || null
        transactionData.source = txSource || 'WEB_POS'
        // ===== END PROMO FIELD INJECTION =====

        // ===== ATOMIC TRANSACTION BLOCK =====
        // All sale operations wrapped for rollback safety
        const transaction = await prisma.$transaction(async (tx) => {
            // Sprint 1: Inject server-computed promo fields into line item snapshots
            const originalLineItems = transactionData.lineItems
            if (originalLineItems && 'create' in originalLineItems && Array.isArray(originalLineItems.create)) {
                for (const lineItem of originalLineItems.create) {
                    const productId = (lineItem as any).productId
                    if (productId && linePromoMap.has(productId)) {
                        const promoData = linePromoMap.get(productId)!
                        ;(lineItem as any).promotionId = promoData.promotionId
                        ;(lineItem as any).promotionName = promoData.promotionName
                        ;(lineItem as any).promotionDiscount = promoData.promotionDiscount.toString()
                    }
                }
            }

            // Create the transaction with line items
            const newTransaction = await tx.transaction.create({
                data: transactionData,
                include: {
                    lineItems: {
                        select: {
                            id: true,
                            type: true,
                            quantity: true,
                            price: true,
                            total: true,
                            serviceNameSnapshot: true,
                            productNameSnapshot: true,
                            cashUnitPrice: true,
                            cardUnitPrice: true,
                            cashLineTotal: true,
                            cardLineTotal: true,
                            lineChargedMode: true,
                            priceCharged: true,
                            discount: true,
                            staffId: true,
                            serviceId: true,
                            productId: true,
                            // Sprint 1: Promo evidence fields
                            promotionId: true,
                            promotionName: true,
                            promotionDiscount: true,
                        }
                    },
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            email: true
                        }
                    }
                }
            })

            // Sprint 1: Decrement inventory (Product model ONLY) + create StockAdjustment audit
            for (const item of items) {
                if (item.type === 'PRODUCT' && item.id && !item.id.startsWith('p') && !item.id.startsWith('custom') && !item.id.startsWith('open')) {
                    const product = productMap.get(item.id)
                    if (product && product.stock !== null && product.stock !== undefined) {
                        await tx.product.update({
                            where: { id: item.id },
                            data: { stock: { decrement: item.quantity } }
                        })

                        // Sprint 1: Immutable stock movement audit record
                        await tx.stockAdjustment.create({
                            data: {
                                productId: item.id,
                                locationId: user.franchiseId, // TODO: use actual locationId from station context
                                quantity: -item.quantity,
                                reason: 'SALE',
                                sourceId: newTransaction.id,
                                previousStock: product.stock,
                                newStock: product.stock - item.quantity,
                                performedBy: user.id,
                            }
                        })
                    }
                }
            }

            // Sprint 1: Atomically consume AgeVerificationSession (prevents replay)
            if (ageSession) {
                await tx.ageVerificationSession.update({
                    where: { id: ageSession.id },
                    data: {
                        consumed: true,
                        consumedByTransactionId: newTransaction.id,
                    }
                })
            }

            return newTransaction
        })
        // ===== END ATOMIC TRANSACTION BLOCK =====

        // ===== AUDIT LOG - Record this sale for legal protection =====
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.SALE_COMPLETED,
            entityType: 'TRANSACTION',
            entityId: transaction.id,
            details: {
                invoiceNumber: transaction.invoiceNumber,
                total: total,
                paymentMethod,
                itemCount: items?.length || 0,
                tip: tip || 0,
                clientId: clientId || null,
                cashAmount: cashAmount || 0,
                cardAmount: cardAmount || 0,
                cardLast4: cardLast4 || null
            }
        })
        // =============================================================

        // ===== STORE IDEMPOTENCY KEY =====
        if (idempotencyKey) {
            await storeIdempotencyKey(idempotencyKey, user.franchiseId, transaction)
        }
        // ===== END STORE IDEMPOTENCY KEY =====

        return NextResponse.json(transaction)
    } catch (error: any) {
        // Log detailed error server-side only
        console.error('[POS_TRANSACTION_POST] Error:', error.code, error.message, error.meta)

        // Include error details for debugging (safe: only shows Prisma error messages, not stack traces)
        return NextResponse.json({
            error: 'Transaction failed. Please try again.',
            debug: {
                code: error.code || 'UNKNOWN',
                message: error.message?.slice(0, 300) || 'No message',
                meta: error.meta || null
            }
        }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    // Support both session (web) and Bearer token (mobile)
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    // If ID is provided, fetch single transaction
    if (id) {
        try {
            const transaction = await prisma.transaction.findUnique({
                where: { id },
                include: {
                    client: true,
                    lineItems: {
                        include: {
                            service: true,
                            product: true
                        }
                    },
                    salonLoyaltyLedgerEntries: {
                        include: { loyaltyProgram: true }
                    },
                    salonLoyaltyRedemptions: {
                        include: { loyaltyProgram: true }
                    }
                }
            })

            if (!transaction) {
                return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
            }

            // Security: Verify transaction belongs to user's franchise
            if (transaction.franchiseId !== user.franchiseId) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }

            // Calculate daily sequence number
            const startOfDay = new Date(transaction.createdAt)
            startOfDay.setHours(0, 0, 0, 0)

            const endOfDay = new Date(transaction.createdAt)
            endOfDay.setHours(23, 59, 59, 999)

            const dailyCount = await prisma.transaction.count({
                where: {
                    franchiseId: user.franchiseId,
                    createdAt: {
                        gte: startOfDay,
                        lte: transaction.createdAt // Count up to this transaction
                    }
                }
            })

            return NextResponse.json({
                ...transaction,
                dailySequence: dailyCount // 1-based index for the day
            })
        } catch (error) {
            console.error('[POS_TRANSACTION_GET_BY_ID]', error)
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        }
    }

    // Multi-transaction search with filters
    try {
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')
        const customerSearch = searchParams.get('customer')
        const minAmount = searchParams.get('minAmount')
        const maxAmount = searchParams.get('maxAmount')
        const paymentMethod = searchParams.get('paymentMethod')
        const status = searchParams.get('status')
        const invoiceNumber = searchParams.get('invoiceNumber')

        const where: any = {
            franchiseId: user.franchiseId
        }

        // ===== RECOVERY HARDENING: EMPLOYEE SCOPE =====
        // Ordinary POS employees should NOT see every transaction in the franchise.
        // They see only their OWN transactions unless they are MANAGER or above.
        // This prevents a regular cashier from browsing/seeing stuck transactions
        // created by other employees. Managers need full visibility for recovery.
        const isManagerOrAbove = ['MANAGER', 'OWNER', 'FRANCHISOR', 'PROVIDER', 'ADMIN'].includes(user.role)
        if (!isManagerOrAbove) {
            where.employeeId = user.id
        }

        // Date range filter
        if (dateFrom || dateTo) {
            where.createdAt = {}
            if (dateFrom) {
                const from = new Date(dateFrom)
                from.setHours(0, 0, 0, 0)
                where.createdAt.gte = from
            }
            if (dateTo) {
                const to = new Date(dateTo)
                to.setHours(23, 59, 59, 999)
                where.createdAt.lte = to
            }
        }

        // Customer name search
        if (customerSearch) {
            where.client = {
                OR: [
                    { firstName: { contains: customerSearch } },
                    { lastName: { contains: customerSearch } }
                ]
            }
        }

        // Amount range filter
        if (minAmount || maxAmount) {
            where.total = {}
            if (minAmount) {
                where.total.gte = parseFloat(minAmount)
            }
            if (maxAmount) {
                where.total.lte = parseFloat(maxAmount)
            }
        }

        // Payment method filter
        if (paymentMethod && paymentMethod !== 'ALL') {
            where.paymentMethod = paymentMethod
        }

        // Status filter (can be comma-separated for multiple)
        if (status && status !== 'ALL') {
            const statuses = status.split(',')
            if (statuses.length === 1) {
                where.status = statuses[0]
            } else {
                where.status = { in: statuses }
            }
        }

        // Invoice number search (partial match on transaction ID)
        if (invoiceNumber) {
            where.id = { contains: invoiceNumber }
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                client: true,
                lineItems: true,
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                salonLoyaltyLedgerEntries: {
                    include: { loyaltyProgram: true }
                },
                salonLoyaltyRedemptions: {
                    include: { loyaltyProgram: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100 // Limit to prevent overwhelming results
        })

        return NextResponse.json(transactions)
    } catch (error) {
        console.error('[POS_TRANSACTION_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

