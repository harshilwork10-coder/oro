import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get store account details and transactions
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const client = await prisma.client.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                hasStoreAccount: true,
                storeAccountBalance: true,
                storeAccountLimit: true,
                storeAccountApprovedAt: true,
                storeAccountTransactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }
            }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        return NextResponse.json({
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            phone: client.phone,
            email: client.email,
            hasStoreAccount: client.hasStoreAccount,
            balance: Number(client.storeAccountBalance),
            limit: Number(client.storeAccountLimit),
            approvedAt: client.storeAccountApprovedAt,
            transactions: client.storeAccountTransactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: Number(t.amount),
                balanceAfter: Number(t.balanceAfter),
                paymentMethod: t.paymentMethod,
                checkNumber: t.checkNumber,
                note: t.note,
                invoiceNumber: t.invoiceNumber,
                employeeName: t.employeeName,
                createdAt: t.createdAt
            }))
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

// POST - Charge or make payment to store account
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { type, amount, transactionId, invoiceNumber, paymentMethod, checkNumber, note } = body

        if (!type || !amount) {
            return NextResponse.json({ error: 'Type and amount required' }, { status: 400 })
        }

        // Get current balance
        const client = await prisma.client.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                franchiseId: true,
                storeAccountBalance: true,
                storeAccountLimit: true,
                hasStoreAccount: true
            }
        })

        if (!client || !client.hasStoreAccount) {
            return NextResponse.json({ error: 'Store account not found' }, { status: 404 })
        }

        const currentBalance = Number(client.storeAccountBalance)
        let newBalance: number

        if (type === 'CHARGE') {
            newBalance = currentBalance + amount
            // Check credit limit
            if (newBalance > Number(client.storeAccountLimit)) {
                return NextResponse.json({
                    error: 'Exceeds credit limit',
                    currentBalance,
                    limit: Number(client.storeAccountLimit),
                    requested: amount
                }, { status: 400 })
            }
        } else if (type === 'PAYMENT') {
            newBalance = Math.max(0, currentBalance - amount)
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        }

        // Create transaction and update balance
        const [transaction, updatedClient] = await prisma.$transaction([
            prisma.storeAccountTransaction.create({
                data: {
                    clientId: client.id,
                    franchiseId: client.franchiseId,
                    type,
                    amount,
                    balanceAfter: newBalance,
                    transactionId,
                    invoiceNumber,
                    paymentMethod,
                    checkNumber,
                    note,
                    employeeId: session.user.id,
                    employeeName: session.user.name || 'Unknown'
                }
            }),
            prisma.client.update({
                where: { id: client.id },
                data: { storeAccountBalance: newBalance }
            })
        ])

        return NextResponse.json({
            success: true,
            transaction: {
                id: transaction.id,
                type: transaction.type,
                amount: Number(transaction.amount),
                balanceAfter: Number(transaction.balanceAfter)
            },
            newBalance
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
