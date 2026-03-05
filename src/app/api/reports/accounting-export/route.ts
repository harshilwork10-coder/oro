// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Export sales data for QuickBooks / Xero journal entry
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format') || 'QUICKBOOKS' // QUICKBOOKS, XERO
        const dateStr = searchParams.get('date')
        const targetDate = dateStr ? new Date(dateStr) : new Date()
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999)

        // Aggregate daily sales
        const transactions = await prisma.transaction.findMany({
            where: { locationId, status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
            select: { total: true, subtotal: true, taxAmount: true, paymentMethod: true, discountAmount: true }
        })

        const cashTotal = transactions.filter(t => t.paymentMethod === 'CASH').reduce((s, t) => s + Number(t.total || 0), 0)
        const cardTotal = transactions.filter(t => t.paymentMethod === 'CARD').reduce((s, t) => s + Number(t.total || 0), 0)
        const ebtTotal = transactions.filter(t => t.paymentMethod === 'EBT').reduce((s, t) => s + Number(t.total || 0), 0)
        const totalSales = transactions.reduce((s, t) => s + Number(t.subtotal || 0), 0)
        const totalTax = transactions.reduce((s, t) => s + Number(t.taxAmount || 0), 0)
        const totalDiscount = transactions.reduce((s, t) => s + Number(t.discountAmount || 0), 0)

        // COGS
        const lineItems = await prisma.transactionLineItem.findMany({
            where: { transaction: { locationId, status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } } },
            select: { quantity: true, item: { select: { cost: true, category: { select: { name: true } } } } }
        })
        const totalCOGS = lineItems.reduce((s, li) => s + Number(li.item?.cost || 0) * (li.quantity || 1), 0)

        const dateFormatted = targetDate.toISOString().split('T')[0]

        if (format === 'QUICKBOOKS') {
            // QuickBooks IIF/Journal format
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
                format: 'QUICKBOOKS',
                date: dateFormatted,
                memo: `Daily POS Sales - ${dateFormatted}`,
                journal,
                transactionCount: transactions.length
            })
        }

        // Xero format
        return ApiResponse.success({
            format: 'XERO',
            date: dateFormatted,
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
        return ApiResponse.error('Failed to generate export')
    }
}
