/**
 * Purchase Order Status Report API
 *
 * GET — Track purchase orders by status, supplier, and spend
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
            select: { franchiseId: true }
        })
        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
        const supplierId = searchParams.get('supplierId')
        const days = parseInt(searchParams.get('days') || '90')
        const since = new Date(); since.setDate(since.getDate() - days)

        const where: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            createdAt: { gte: since }
        }
        if (status) where.status = status
        if (supplierId) where.supplierId = supplierId

        const orders = await prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: { select: { id: true, name: true } },
                location: { select: { id: true, name: true } },
                items: {
                    include: { product: { select: { name: true, barcode: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const results = orders.map(po => ({
            id: po.id,
            orderNumber: po.orderNumber,
            supplier: po.supplier?.name || 'Unknown',
            supplierId: po.supplierId,
            location: po.location?.name || 'Unknown',
            status: po.status,
            itemCount: po.items.length,
            totalCost: Math.round(po.items.reduce((s, i) => s + Number(i.totalCost || 0), 0) * 100) / 100,
            expectedDate: po.expectedDate,
            createdAt: po.createdAt,
            items: po.items.map(i => ({
                product: i.product?.name || 'Unknown',
                barcode: i.product?.barcode,
                quantity: i.quantity,
                unitCost: Number(i.unitCost || 0),
                totalCost: Number(i.totalCost || 0)
            }))
        }))

        // Summary
        const statusGroups: Record<string, { count: number; totalCost: number }> = {}
        for (const order of results) {
            if (!statusGroups[order.status]) statusGroups[order.status] = { count: 0, totalCost: 0 }
            statusGroups[order.status].count++
            statusGroups[order.status].totalCost += order.totalCost
        }

        // Round
        for (const key of Object.keys(statusGroups)) {
            statusGroups[key].totalCost = Math.round(statusGroups[key].totalCost * 100) / 100
        }

        const summary = {
            totalOrders: results.length,
            totalSpend: Math.round(results.reduce((s, r) => s + r.totalCost, 0) * 100) / 100,
            byStatus: statusGroups
        }

        return ApiResponse.success({ orders: results, summary, periodDays: days })
    } catch (error) {
        console.error('[PO_REPORT_GET]', error)
        return ApiResponse.error('Failed to generate purchase order report', 500)
    }
}
