'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Customer segmentation by spend level and visit frequency
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '90')
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get all customers with transactions
        const customers = await prisma.client.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true }
        })

        // Get transaction data per customer
        const txData = await prisma.transaction.groupBy({
            by: ['customerId'],
            where: { status: 'COMPLETED', createdAt: { gte: since }, customerId: { not: null } },
            _sum: { total: true },
            _count: { id: true }
        })

        const txMap = new Map(txData.map(t => [t.customerId!, { total: Number(t._sum.total || 0), visits: t._count.id }]))

        // Segment customers
        const segmented = customers.map(c => {
            const data = txMap.get(c.id)
            const totalSpent = data?.total || 0
            const visits = data?.visits || 0
            const avgTicket = visits > 0 ? totalSpent / visits : 0

            let segment: string
            if (totalSpent >= 500 && visits >= 10) segment = 'VIP'
            else if (totalSpent >= 200 || visits >= 5) segment = 'REGULAR'
            else if (visits >= 1) segment = 'OCCASIONAL'
            else segment = 'INACTIVE'

            return {
                id: c.id,
                name: `${c.firstName} ${c.lastName}`.trim(),
                email: c.email,
                phone: c.phone,
                segment,
                totalSpent: Math.round(totalSpent * 100) / 100,
                visits,
                avgTicket: Math.round(avgTicket * 100) / 100,
                daysSinceSignup: Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000)
            }
        }).sort((a, b) => b.totalSpent - a.totalSpent)

        const summary = {
            VIP: { count: segmented.filter(s => s.segment === 'VIP').length, revenue: Math.round(segmented.filter(s => s.segment === 'VIP').reduce((s, c) => s + c.totalSpent, 0) * 100) / 100 },
            REGULAR: { count: segmented.filter(s => s.segment === 'REGULAR').length, revenue: Math.round(segmented.filter(s => s.segment === 'REGULAR').reduce((s, c) => s + c.totalSpent, 0) * 100) / 100 },
            OCCASIONAL: { count: segmented.filter(s => s.segment === 'OCCASIONAL').length, revenue: Math.round(segmented.filter(s => s.segment === 'OCCASIONAL').reduce((s, c) => s + c.totalSpent, 0) * 100) / 100 },
            INACTIVE: { count: segmented.filter(s => s.segment === 'INACTIVE').length, revenue: 0 }
        }

        return ApiResponse.success({ customers: segmented, summary, periodDays: days })
    } catch (error) {
        console.error('[SEGMENTATION_GET]', error)
        return ApiResponse.error('Failed to segment customers')
    }
}
