/**
 * Purchase Order Status Report API
 *
 * GET — Track purchase orders by status, supplier, and spend
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
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

        return NextResponse.json({ orders: results, summary, periodDays: days })
    } catch (error) {
        console.error('[PO_REPORT_GET]', error)
        return NextResponse.json({ error: 'Failed to generate purchase order report' }, { status: 500 })
    }
}
