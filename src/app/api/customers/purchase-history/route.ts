'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Lookup customer purchase history
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { phone, email, clientId } = body

        // Find customer
        let client = null
        if (clientId) {
            client = await prisma.client.findFirst({ where: { id: clientId, franchiseId: user.franchiseId } })
        } else if (phone) {
            client = await prisma.client.findFirst({ where: { phone, franchiseId: user.franchiseId } })
        } else if (email) {
            client = await prisma.client.findFirst({ where: { email, franchiseId: user.franchiseId } })
        }

        if (!client) return ApiResponse.notFound('Customer not found')

        // Get recent transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                customerId: client.id,
                status: 'COMPLETED'
            },
            include: {
                items: { select: { name: true, quantity: true, unitPrice: true, total: true } },
                location: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        // Stats
        const totalSpent = transactions.reduce((s, t) => s + Number(t.total || 0), 0)
        const visitCount = transactions.length
        const avgTicket = visitCount > 0 ? totalSpent / visitCount : 0

        // Most purchased items
        const itemCounts: Record<string, { name: string; count: number }> = {}
        for (const tx of transactions) {
            for (const item of tx.items) {
                const key = item.name
                if (!itemCounts[key]) itemCounts[key] = { name: key, count: 0 }
                itemCounts[key].count += item.quantity || 1
            }
        }
        const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5)

        return ApiResponse.success({
            customer: {
                id: client.id,
                name: client.name,
                phone: client.phone,
                email: client.email,
                taxExempt: client.taxExempt
            },
            stats: {
                totalSpent: Math.round(totalSpent * 100) / 100,
                visitCount,
                avgTicket: Math.round(avgTicket * 100) / 100,
                topItems
            },
            recentTransactions: transactions
        })
    } catch (error) {
        console.error('[PURCHASE_HISTORY_POST]', error)
        return ApiResponse.error('Failed to fetch purchase history')
    }
}
