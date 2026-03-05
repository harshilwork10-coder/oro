// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Create / charge to house account (tab)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { action, customerId, transactionId, amount, notes } = body

        if (action === 'CHARGE') {
            // Add charge to house account
            if (!customerId || !amount) return ApiResponse.badRequest('customerId and amount required')

            const entry = await (prisma as any).storeAccountTransaction.create({
                data: {
                    locationId,
                    customerId,
                    type: 'CHARGE',
                    amount,
                    transactionId: transactionId || null,
                    notes: notes || null,
                    createdBy: user.id
                }
            })
            return ApiResponse.success({ entry })
        }

        if (action === 'PAYMENT') {
            if (!customerId || !amount) return ApiResponse.badRequest('customerId and amount required')

            const entry = await (prisma as any).storeAccountTransaction.create({
                data: {
                    locationId,
                    customerId,
                    type: 'PAYMENT',
                    amount: -Math.abs(amount), // Negative = reduces balance
                    notes: notes || 'Payment received',
                    createdBy: user.id
                }
            })
            return ApiResponse.success({ entry })
        }

        return ApiResponse.badRequest('action (CHARGE or PAYMENT) required')
    } catch (error) {
        console.error('[HOUSE_ACCOUNT_POST]', error)
        return ApiResponse.error('Failed to process house account')
    }
}

// GET — Get house account balance and history
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customerId')

        if (customerId) {
            // Single customer balance + history
            const entries = await (prisma as any).storeAccountTransaction.findMany({
                where: { locationId, customerId },
                orderBy: { createdAt: 'desc' },
                take: 100
            })
            const balance = entries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
            return ApiResponse.success({ customerId, balance: Math.round(balance * 100) / 100, entries })
        }

        // All customers with open balances
        const allEntries = await (prisma as any).storeAccountTransaction.findMany({
            where: { locationId },
            select: { customerId: true, amount: true }
        })

        const balances: Record<string, number> = {}
        for (const e of allEntries) {
            balances[e.customerId] = (balances[e.customerId] || 0) + Number(e.amount || 0)
        }

        const openAccounts = Object.entries(balances)
            .filter(([, bal]) => Math.abs(bal) > 0.01)
            .map(([custId, bal]) => ({ customerId: custId, balance: Math.round(bal * 100) / 100 }))
            .sort((a, b) => b.balance - a.balance)

        return ApiResponse.success({
            accounts: openAccounts,
            totalOutstanding: Math.round(openAccounts.reduce((s, a) => s + Math.max(0, a.balance), 0) * 100) / 100
        })
    } catch (error) {
        console.error('[HOUSE_ACCOUNT_GET]', error)
        return ApiResponse.error('Failed to fetch house accounts')
    }
}
