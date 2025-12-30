import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

        // Build date range
        const startDateTime = new Date(startDate)
        startDateTime.setHours(0, 0, 0, 0)

        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)

        // Get franchise ID from session
        const user = await prisma.user.findUnique({
            where: { id: session.user.id as string },
            select: { franchiseId: true, franchisor: true }
        })

        const franchiseId = user?.franchiseId

        if (!franchiseId) {
            return NextResponse.json({
                transactions: [],
                message: 'No franchise associated with user'
            })
        }

        // Get all card transactions for the date range
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                createdAt: {
                    gte: startDateTime,
                    lte: endDateTime
                },
                // Only card payments (not cash)
                OR: [
                    { paymentMethod: 'CREDIT_CARD' },
                    { paymentMethod: 'DEBIT_CARD' },
                    { paymentMethod: 'CARD' }
                ]
            },
            select: {
                id: true,
                createdAt: true,
                subtotal: true,
                tip: true,
                total: true,
                status: true,
                paymentMethod: true,
                // Card transaction details (stored from PAX response)
                cardType: true,
                cardLast4: true,
                authCode: true,
                invoiceNumber: true,
                // Employee info
                employee: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Format for response
        const formattedTransactions = transactions.map(tx => {
            const date = new Date(tx.createdAt)
            return {
                id: tx.id,
                date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                invoiceNumber: tx.invoiceNumber || tx.id.slice(-8).toUpperCase(),
                cardType: tx.cardType || 'CARD',
                last4: tx.cardLast4 || '****',
                authCode: tx.authCode || 'N/A',
                amount: Number(tx.subtotal || 0),
                tipAmount: Number(tx.tip || 0),
                totalAmount: Number(tx.total || 0),
                status: tx.status || 'COMPLETED',
                employeeName: tx.employee?.name || 'Unknown'
            }
        })

        // Calculate batch totals
        const batchTotals = {
            transactionCount: formattedTransactions.length,
            subtotal: formattedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
            tips: formattedTransactions.reduce((sum, tx) => sum + tx.tipAmount, 0),
            total: formattedTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0)
        }

        return NextResponse.json({
            success: true,
            transactions: formattedTransactions,
            totals: batchTotals,
            dateRange: {
                start: startDate,
                end: endDate
            }
        })

    } catch (error) {
        console.error('Error fetching CC batch report:', error)
        return NextResponse.json(
            { error: 'Failed to fetch credit card batch report' },
            { status: 500 }
        )
    }
}

