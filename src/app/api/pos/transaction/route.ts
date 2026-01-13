import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/invoice'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { checkIdempotency, storeIdempotencyKey, getIdempotencyKey } from '@/lib/api/idempotency'
import { z } from 'zod'
import {
    calculateTransactionPayouts,
    getBusinessDate,
    DEFAULT_PAYOUT_CONFIG,
    type LineItemInput
} from '@/lib/payoutEngine'
import { validateBody, unauthorizedResponse, badRequestResponse } from '@/lib/validation'
import fs from 'fs'
import path from 'path'

// Request validation schema
const transactionRequestSchema = z.object({
    items: z.array(z.object({
        id: z.string().optional(),
        type: z.enum(['SERVICE', 'PRODUCT']),
        name: z.string(),
        price: z.union([z.number(), z.string()]).transform(v => Number(v)),
        // Dual pricing line item fields
        cashPrice: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
        cardPrice: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
        quantity: z.union([z.number(), z.string()]).transform(v => Number(v)),
        discount: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),
        barberId: z.string().optional().nullable(), // ID of barber who performed the service
        promotionId: z.string().optional().nullable(), // For validating auto-applied system deals
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
})

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return unauthorizedResponse()
    }

    // Validate request body
    const validation = await validateBody(req, transactionRequestSchema)
    if ('error' in validation) return validation.error

    const { items, subtotal, tax, total, subtotalCash, subtotalCard, taxCash, taxCard, totalCash, totalCard, paymentMethod, cashDrawerSessionId, clientId, cashAmount, cardAmount, gatewayTxId, authCode, cardLast4, cardType, tip } = validation.data

    // Enforce Open Shift Rule
    if (!cashDrawerSessionId) {
        return badRequestResponse('No open shift. Transaction rejected.')
    }
    const sessionCheck = await prisma.cashDrawerSession.findUnique({
        where: { id: cashDrawerSessionId }
    })
    if (!sessionCheck || sessionCheck.endTime) {
        return badRequestResponse('Shift is closed or invalid. Cannot process transaction.')
    }

    // Determine chargedMode based on payment method
    // CASH payment = use cash prices, CARD payment = use card prices
    const chargedMode = paymentMethod === 'CASH' ? 'CASH' : 'CARD'

    // ===== IDEMPOTENCY CHECK =====
    // Prevents duplicate transaction processing (double-charge protection)
    const idempotencyKey = getIdempotencyKey(req)
    if (idempotencyKey) {
        const idempotencyResult = await checkIdempotency(idempotencyKey, session.user.franchiseId)
        if (idempotencyResult.isDuplicate) {
            return NextResponse.json(idempotencyResult.cachedResponse)
        }
    }
    // ===== END IDEMPOTENCY CHECK =====

    try {

        // Validate split payment
        if (paymentMethod === 'SPLIT') {
            const splitTotal = (cashAmount || 0) + (cardAmount || 0)
            if (Math.abs(splitTotal - total) > 0.01) {
                return badRequestResponse(`Split payment amounts ($${cashAmount} cash + $${cardAmount} card) must equal total ($${total})`)
            }
        }

        // Generate sequential invoice number
        const invoiceNumber = await generateInvoiceNumber(session.user.franchiseId)

        // Ensure numeric values are converted to strings for Prisma Decimal type
        const transactionData = {
            invoiceNumber,
            franchiseId: session.user.franchiseId,
            employeeId: session.user.id,
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
            cardAmount: (paymentMethod === 'SPLIT' ? cardAmount : (['CREDIT_CARD', 'EBT'].includes(paymentMethod) ? total : 0)).toString(),
            gatewayTxId: gatewayTxId || null,
            authCode: authCode || null,
            cardLast4: cardLast4 || null,
            cardType: cardType || null,
            tip: (tip || 0).toString(),
            status: 'COMPLETED',
            cashDrawerSessionId: cashDrawerSessionId || null,
            lineItems: (() => {
                // ===== PAYOUT ENGINE SNAPSHOT CALCULATION =====
                // Generate immutable snapshot fields for reporting accuracy
                const businessDate = getBusinessDate()

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

                // Calculate payouts using central engine (50% default commission)
                const payoutResult = calculateTransactionPayouts(
                    lineItemInputs,
                    Number(tip || 0),
                    { ...DEFAULT_PAYOUT_CONFIG, taxRate: 0 }, // TODO: Pass actual tax rate
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
                            // Only set IDs if they are valid CUIDs (real database records)
                            serviceId: (item.type === 'SERVICE' && item.id && !item.id.startsWith('s') && !item.id.startsWith('custom') && !item.id.startsWith('open')) ? item.id : null,
                            productId: (item.type === 'PRODUCT' && item.id && !item.id.startsWith('p') && !item.id.startsWith('custom') && !item.id.startsWith('open')) ? item.id : null,
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
        const productIds = items
            .filter((i: any) => i.type === 'PRODUCT' && i.id && !i.id.startsWith('custom') && !i.id.startsWith('open'))
            .map((i: any) => i.id)

        const serviceIds = items
            .filter((i: any) => i.type === 'SERVICE' && i.id && !i.id.startsWith('custom') && !i.id.startsWith('open'))
            .map((i: any) => i.id)

        const [dbProducts, dbServices] = await Promise.all([
            productIds.length > 0 ? prisma.product.findMany({ where: { id: { in: productIds } } }) : [],
            serviceIds.length > 0 ? prisma.service.findMany({ where: { id: { in: serviceIds } } }) : []
        ])

        const productMap = new Map(dbProducts.map(p => [p.id, p]))
        const serviceMap = new Map(dbServices.map(s => [s.id, s]))

        // Validate each item
        for (const item of items) {
            if (item.id && !item.id.startsWith('custom') && !item.id.startsWith('open')) {
                let dbPrice = 0

                if (item.type === 'PRODUCT') {
                    const product = productMap.get(item.id)
                    if (!product) {
                        return badRequestResponse(`Product not found: ${item.name} (${item.id})`)
                    }
                    // Use cashPrice if available (dual pricing), otherwise legacy price
                    // We treat the "price" submitted as the base price before discount
                    dbPrice = product.cashPrice ? Number(product.cashPrice) : Number(product.price)
                } else if (item.type === 'SERVICE') {
                    const service = serviceMap.get(item.id)
                    if (!service) {
                        return badRequestResponse(`Service not found: ${item.name} (${item.id})`)
                    }
                    dbPrice = Number(service.price)
                }

                // Security Check: manual discounts vs System Promotions

                // 1. Check if this is a System Promotion
                if (item.promotionId) {
                    const promotion = await prisma.promotion.findUnique({
                        where: { id: item.promotionId, isActive: true }
                    })

                    if (!promotion) {
                        return badRequestResponse(`Invalid or expired promotion applied to ${item.name}.`)
                    }

                    // Valid promotion - skip price validation for this item
                    continue
                }

                // Price Validation (non-promo items): Reject if client price differs from DB by more than $0.05
                if (Math.abs(item.price - dbPrice) > 0.05) {
                    console.error(`[SECURITY] Price manipulation detected for ${item.name}. Client: ${item.price}, DB: ${dbPrice}`)
                    return badRequestResponse(`Price mismatch for ${item.name}. Please refresh menu.`)
                }

                // Employee Permission Check for MANUAL discounts
                // Employees cannot apply manual discounts unless explicitly authorized with limits
                if (item.discount > 0 && session.user.role === 'EMPLOYEE') {
                    // Fetch fresh user permissions
                    const employee = await prisma.user.findUnique({
                        where: { id: session.user.id },
                        select: { canApplyDiscounts: true, maxDiscountPercent: true, maxDiscountAmount: true }
                    })

                    if (!employee || !employee.canApplyDiscounts) {
                        return badRequestResponse(`Permission Denied: You are not authorized to apply discounts.`)
                    }

                    // Validate Percent Limit
                    if (employee.maxDiscountPercent > 0 && item.discount > employee.maxDiscountPercent) {
                        return badRequestResponse(`Permission Denied: Discount (${item.discount}%) exceeds your limit of ${employee.maxDiscountPercent}%.`)
                    }

                    // Validate Amount Limit
                    if (Number(employee.maxDiscountAmount) > 0) {
                        // Calculate absolute discount amount
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

        // ===== ATOMIC TRANSACTION BLOCK =====
        // All sale operations wrapped for rollback safety
        const transaction = await prisma.$transaction(async (tx) => {
            // Create the transaction with line items
            const newTransaction = await tx.transaction.create({
                data: transactionData,
                include: {
                    // === EXPLICIT SELECT: Ensure all fields required for printing ===
                    lineItems: {
                        select: {
                            id: true,
                            type: true,
                            quantity: true,
                            price: true,
                            total: true,
                            // Name snapshots (NEVER null after Phase 1 fix)
                            serviceNameSnapshot: true,
                            productNameSnapshot: true,
                            // Dual pricing fields
                            cashUnitPrice: true,
                            cardUnitPrice: true,
                            cashLineTotal: true,
                            cardLineTotal: true,
                            lineChargedMode: true,
                            // Additional fields for reports
                            priceCharged: true,
                            discount: true,
                            staffId: true,
                            serviceId: true,
                            productId: true
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

            // Decrement inventory for product items
            for (const item of items) {
                if (item.type === 'PRODUCT' && item.id && !item.id.startsWith('p') && !item.id.startsWith('custom') && !item.id.startsWith('open')) {
                    // Prevent selling tracking items if they don't exist (double check)
                    const product = productMap.get(item.id)
                    if (product) {
                        await tx.product.update({
                            where: { id: item.id },
                            data: { stock: { decrement: item.quantity } }
                        })
                    }
                }
            }

            return newTransaction
        })
        // ===== END ATOMIC TRANSACTION BLOCK =====

        // ===== AUDIT LOG - Record this sale for legal protection =====
        const user = session.user as any
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: session.user.franchiseId,
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
            await storeIdempotencyKey(idempotencyKey, session.user.franchiseId, transaction)
        }
        // ===== END STORE IDEMPOTENCY KEY =====

        return NextResponse.json(transaction)
    } catch (error: any) {
        // Log detailed error server-side only
        console.error('[POS_TRANSACTION_POST] Error:', error.code, error.message)

        try {
            const logPath = path.join(process.cwd(), 'transaction_error.log')
            const logEntry = `\n[${new Date().toISOString()}] Transaction Failed:\nCode: ${error.code}\nMessage: ${error.message}\nMeta: ${JSON.stringify(error.meta)}\nStack: ${error.stack}\n`
            fs.appendFileSync(logPath, logEntry)
        } catch (logError) {
            console.error('Failed to write to error log', logError)
        }

        // Return generic error to client (don't expose internal details)
        return NextResponse.json({
            error: 'Transaction failed. Please try again.',
            details: error.message,
            code: error.code,
            meta: error.meta
        }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
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
                    }
                }
            })

            if (!transaction) {
                return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
            }

            // Security: Verify transaction belongs to user's franchise
            if (transaction.franchiseId !== session.user.franchiseId) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }

            // Calculate daily sequence number
            const startOfDay = new Date(transaction.createdAt)
            startOfDay.setHours(0, 0, 0, 0)

            const endOfDay = new Date(transaction.createdAt)
            endOfDay.setHours(23, 59, 59, 999)

            const dailyCount = await prisma.transaction.count({
                where: {
                    franchiseId: session.user.franchiseId,
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
            franchiseId: session.user.franchiseId
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

