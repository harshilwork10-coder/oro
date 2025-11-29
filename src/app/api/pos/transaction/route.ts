import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/invoice'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { items, subtotal, tax, total, paymentMethod, cashDrawerSessionId, clientId, cashAmount, cardAmount, gatewayTxId, authCode, cardLast4, cardType } = body

        console.log('[POS_TRANSACTION_POST] Received data:', {
            itemsCount: items?.length,
            subtotal,
            tax,
            total,
            paymentMethod,
            cashDrawerSessionId,
            clientId,
            cashAmount,
            cardAmount,
            gatewayTxId,
            authCode,
            cardLast4,
            cardType,
            franchiseId: session.user.franchiseId,
            employeeId: session.user.id
        })

        // Validate split payment
        if (paymentMethod === 'SPLIT') {
            const splitTotal = (parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0)
            if (Math.abs(splitTotal - parseFloat(total)) > 0.01) {
                return NextResponse.json({
                    error: `Split payment amounts ($${cashAmount} cash + $${cardAmount} card) must equal total ($${total})`
                }, { status: 400 })
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
            cardAmount: (paymentMethod === 'SPLIT' ? cardAmount : (paymentMethod !== 'CASH' ? total : 0)).toString(),
            gatewayTxId: gatewayTxId || null,
            authCode: authCode || null,
            cardLast4: cardLast4 || null,
            cardType: cardType || null,
            status: 'COMPLETED',
            cashDrawerSessionId: cashDrawerSessionId || null,
            lineItems: {
                create: items.map((item: any) => {
                    const itemSubtotal = item.price * item.quantity
                    const discountAmount = itemSubtotal * ((item.discount || 0) / 100)
                    const itemTotal = itemSubtotal - discountAmount

                    return {
                        type: item.type,
                        // Only set IDs if they exist in database (non-mock data)
                        serviceId: (item.type === 'SERVICE' && item.id && !item.id.startsWith('s')) ? item.id : null,
                        productId: (item.type === 'PRODUCT' && item.id && !item.id.startsWith('p')) ? item.id : null,
                        quantity: parseInt(item.quantity.toString()),
                        price: item.price.toString(),
                        discount: (item.discount || 0).toString(),
                        total: itemTotal.toString()
                    }
                })
            }
        }

        console.log('[POS_TRANSACTION_POST] Creating transaction with:', JSON.stringify(transactionData, null, 2))

        const transaction = await prisma.transaction.create({
            data: transactionData,
            include: {
                lineItems: true,
                client: true
            }
        })

        return NextResponse.json(transaction)
    } catch (error: any) {
        console.error('[POS_TRANSACTION_POST]', error)
        console.error('Error details:', {
            code: error.code,
            meta: error.meta,
            message: error.message
        })
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            code: error.code,
            details: error.meta
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
                lineItems: true
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
