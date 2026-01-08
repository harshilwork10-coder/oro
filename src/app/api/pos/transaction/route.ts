import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/invoice'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { checkIdempotency, storeIdempotencyKey, getIdempotencyKey } from '@/lib/api/idempotency'
import { z } from 'zod'
import { validateBody, unauthorizedResponse, badRequestResponse } from '@/lib/validation'

// Request validation schema
const transactionRequestSchema = z.object({
    items: z.array(z.object({
        id: z.string().optional(),
        type: z.enum(['SERVICE', 'PRODUCT']),
        name: z.string(),
        price: z.union([z.number(), z.string()]).transform(v => Number(v)),
        quantity: z.union([z.number(), z.string()]).transform(v => Number(v)),
        discount: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),
    })).min(1, 'At least one item required'),
    subtotal: z.union([z.number(), z.string()]).transform(v => Number(v)),
    tax: z.union([z.number(), z.string()]).transform(v => Number(v)),
    total: z.union([z.number(), z.string()]).transform(v => Number(v)),
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

    const { items, subtotal, tax, total, paymentMethod, cashDrawerSessionId, clientId, cashAmount, cardAmount, gatewayTxId, authCode, cardLast4, cardType, tip } = validation.data

    // ===== IDEMPOTENCY CHECK =====
    // Prevents duplicate transaction processing (double-charge protection)
    const idempotencyKey = getIdempotencyKey(req)
    if (idempotencyKey) {
        const idempotencyResult = await checkIdempotency(idempotencyKey, session.user.franchiseId)
        if (idempotencyResult.isDuplicate) {
            console.log(`[POS_TRANSACTION] Duplicate request detected, returning cached response`)
            return NextResponse.json(idempotencyResult.cachedResponse)
        }
    }
    // ===== END IDEMPOTENCY CHECK =====

    try {
        // Security: Log minimal info only
        console.log(`[POS_TRANSACTION] Processing ${paymentMethod} transaction for ${items?.length || 0} items`)

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
            lineItems: {
                create: items.map((item: any) => {
                    const itemSubtotal = item.price * item.quantity
                    const discountAmount = itemSubtotal * ((item.discount || 0) / 100)
                    const itemTotal = itemSubtotal - discountAmount

                    return {
                        type: item.type,
                        // Only set IDs if they are valid CUIDs (real database records)
                        // Skip mock data (starts with 's' or 'p') and custom items (starts with 'custom-')
                        serviceId: (item.type === 'SERVICE' && item.id && !item.id.startsWith('s') && !item.id.startsWith('custom')) ? item.id : null,
                        productId: (item.type === 'PRODUCT' && item.id && !item.id.startsWith('p') && !item.id.startsWith('custom')) ? item.id : null,
                        quantity: parseInt(item.quantity.toString()),
                        price: item.price.toString(),
                        discount: (item.discount || 0).toString(),
                        total: itemTotal.toString()
                    }
                })
            }
        }

        console.log('[POS_TRANSACTION_POST] Creating transaction atomically')

        // ===== ATOMIC TRANSACTION BLOCK =====
        // All sale operations wrapped for rollback safety
        const transaction = await prisma.$transaction(async (tx) => {
            // Create the transaction with line items
            const newTransaction = await tx.transaction.create({
                data: transactionData,
                include: {
                    lineItems: true,
                    client: true
                }
            })

            // Decrement inventory for product items
            for (const item of items) {
                if (item.type === 'PRODUCT' && item.id && !item.id.startsWith('p') && !item.id.startsWith('custom')) {
                    await tx.product.update({
                        where: { id: item.id },
                        data: { stock: { decrement: item.quantity } }
                    })
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

        // Return generic error to client (don't expose internal details)
        return NextResponse.json({
            error: 'Transaction failed. Please try again.'
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

