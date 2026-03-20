/**
 * Accounting Export API (QuickBooks / Xero Journal Entry)
 *
 * GET — Generate daily journal entry data for accounting software import
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, franchiseId: true }
        })

        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role || '')) {
            return ApiResponse.forbidden('Owner+ only')
        }

        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format') || 'QUICKBOOKS'
        const dateStr = searchParams.get('date')
        const targetDate = dateStr ? new Date(dateStr) : new Date()
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999)

        const franchiseId = user.franchiseId

        // Get day's transactions
        const transactions = await prisma.transaction.findMany({
            where: { franchiseId, status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
            select: { total: true, subtotal: true, tax: true, paymentMethod: true, discount: true }
        })

        // Get line items for COGS calculation
        const lineItems = await prisma.transactionLineItem.findMany({
            where: {
                type: 'PRODUCT',
                transaction: { franchiseId, status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } }
            },
            select: { quantity: true, product: { select: { cost: true } } }
        })

        const cashTotal = transactions.filter(t => t.paymentMethod === 'CASH').reduce((s, t) => s + Number(t.total || 0), 0)
        const cardTotal = transactions.filter(t => ['CREDIT_CARD', 'DEBIT_CARD'].includes(t.paymentMethod)).reduce((s, t) => s + Number(t.total || 0), 0)
        const ebtTotal = transactions.filter(t => t.paymentMethod === 'EBT').reduce((s, t) => s + Number(t.total || 0), 0)
        const totalSales = transactions.reduce((s, t) => s + Number(t.subtotal || 0), 0)
        const totalTax = transactions.reduce((s, t) => s + Number(t.tax || 0), 0)
        const totalDiscount = transactions.reduce((s, t) => s + Number(t.discount || 0), 0)
        const totalCOGS = lineItems.reduce((s, li) => s + Number(li.product?.cost || 0) * (li.quantity || 1), 0)

        const dateFormatted = targetDate.toISOString().split('T')[0]

        if (format === 'QUICKBOOKS') {
            const journal = [
                { account: 'Cash on Hand', debit: Math.round(cashTotal * 100) / 100, credit: 0 },
                { account: 'Undeposited Funds (Card)', debit: Math.round(cardTotal * 100) / 100, credit: 0 },
                { account: 'Undeposited Funds (EBT)', debit: Math.round(ebtTotal * 100) / 100, credit: 0 },
                { account: 'Sales Revenue', debit: 0, credit: Math.round(totalSales * 100) / 100 },
                { account: 'Sales Tax Payable', debit: 0, credit: Math.round(totalTax * 100) / 100 },
                ...(totalDiscount > 0 ? [{ account: 'Discounts Given', debit: Math.round(totalDiscount * 100) / 100, credit: 0 }] : []),
                { account: 'Cost of Goods Sold', debit: Math.round(totalCOGS * 100) / 100, credit: 0 },
                { account: 'Inventory Asset', debit: 0, credit: Math.round(totalCOGS * 100) / 100 }
            ]

            return ApiResponse.success({
                format: 'QUICKBOOKS', date: dateFormatted,
                memo: `Daily POS Sales - ${dateFormatted}`,
                journal, transactionCount: transactions.length
            })
        }

        // Xero format
        return ApiResponse.success({
            format: 'XERO', date: dateFormatted,
            reference: `POS-${dateFormatted}`,
            lines: [
                { accountCode: '200', description: 'Cash Sales', amount: Math.round(cashTotal * 100) / 100 },
                { accountCode: '201', description: 'Card Sales', amount: Math.round(cardTotal * 100) / 100 },
                { accountCode: '202', description: 'EBT Sales', amount: Math.round(ebtTotal * 100) / 100 },
                { accountCode: '400', description: 'Sales Revenue', amount: -Math.round(totalSales * 100) / 100 },
                { accountCode: '820', description: 'Sales Tax', amount: -Math.round(totalTax * 100) / 100 },
                { accountCode: '500', description: 'COGS', amount: Math.round(totalCOGS * 100) / 100 },
                { accountCode: '120', description: 'Inventory', amount: -Math.round(totalCOGS * 100) / 100 }
            ],
            transactionCount: transactions.length
        })
    } catch (error) {
        console.error('[ACCOUNTING_EXPORT_GET]', error)
        return ApiResponse.error('Failed to generate export', 500)
    }
}
