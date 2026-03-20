// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Expiration tracking: items expiring soon
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const daysAhead = parseInt(searchParams.get('days') || '7')

        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + daysAhead)

        const items = await prisma.item.findMany({
            where: {
                franchiseId: user.franchiseId,
                type: 'PRODUCT',
                isActive: true,
                expirationDate: { lte: cutoff, not: null }
            },
            select: {
                id: true, name: true, barcode: true, sku: true,
                stock: true, price: true, cost: true,
                expirationDate: true,
                category: { select: { name: true } }
            },
            orderBy: { expirationDate: 'asc' }
        })

        const now = new Date()
        const report = items.map(item => {
            const daysLeft = Math.ceil((new Date(item.expirationDate!).getTime() - now.getTime()) / 86400000)
            return {
                ...item,
                category: item.category?.name || 'Uncategorized',
                daysUntilExpiry: daysLeft,
                status: daysLeft < 0 ? 'EXPIRED' : daysLeft <= 3 ? 'CRITICAL' : 'WARNING',
                potentialLoss: Math.round(Number(item.cost || 0) * (item.stock || 0) * 100) / 100
            }
        })

        return ApiResponse.success({
            items: report,
            summary: {
                expired: report.filter(r => r.status === 'EXPIRED').length,
                critical: report.filter(r => r.status === 'CRITICAL').length,
                warning: report.filter(r => r.status === 'WARNING').length,
                totalPotentialLoss: Math.round(report.reduce((s, r) => s + r.potentialLoss, 0) * 100) / 100
            }
        })
    } catch (error) {
        console.error('[EXPIRY_GET]', error)
        return ApiResponse.error('Failed to fetch expiring items')
    }
}
