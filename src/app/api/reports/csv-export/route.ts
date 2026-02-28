'use strict'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST — Export report data as CSV
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = session.user as any
        const locationId = user.locationId

        const body = await request.json()
        const { reportType, dateFrom, dateTo } = body as {
            reportType: string // TRANSACTIONS, ITEMS, INVENTORY, EMPLOYEES
            dateFrom?: string
            dateTo?: string
        }

        const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000)
        const to = dateTo ? new Date(dateTo) : new Date()

        let csvRows: string[] = []

        switch (reportType) {
            case 'TRANSACTIONS': {
                csvRows.push('Date,Time,Transaction ID,Employee,Payment Method,Subtotal,Tax,Total,Status')
                const txs = await prisma.transaction.findMany({
                    where: { locationId: locationId || undefined, createdAt: { gte: from, lte: to } },
                    include: { employee: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 5000
                })
                for (const tx of txs) {
                    const d = new Date(tx.createdAt)
                    csvRows.push(`${d.toLocaleDateString()},${d.toLocaleTimeString()},${tx.id},${tx.employee?.name || ''},${tx.paymentMethod},${tx.subtotal},${tx.taxAmount || 0},${tx.total},${tx.status}`)
                }
                break
            }
            case 'ITEMS': {
                csvRows.push('Name,Barcode,SKU,Price,Cost,Stock,Category,EBT,WIC,Active')
                const items = await prisma.item.findMany({
                    where: { franchiseId: user.franchiseId, type: 'PRODUCT' },
                    include: { category: { select: { name: true } } },
                    orderBy: { name: 'asc' },
                    take: 10000
                })
                for (const item of items) {
                    csvRows.push(`"${item.name}",${item.barcode || ''},${item.sku || ''},${item.price},${item.cost || 0},${item.stock || 0},"${item.category?.name || ''}",${item.isEbtEligible},${item.isWicEligible},${item.isActive}`)
                }
                break
            }
            case 'INVENTORY': {
                csvRows.push('Name,Barcode,Stock,Cost,Stock Value,Par Level,Reorder Qty')
                const inv = await prisma.item.findMany({
                    where: { franchiseId: user.franchiseId, type: 'PRODUCT', isActive: true },
                    orderBy: { name: 'asc' },
                    take: 10000
                })
                for (const item of inv) {
                    const stockValue = (item.stock || 0) * Number(item.cost || 0)
                    csvRows.push(`"${item.name}",${item.barcode || ''},${item.stock || 0},${item.cost || 0},${stockValue.toFixed(2)},${item.parLevel || ''},${item.autoReorderQty || ''}`)
                }
                break
            }
            case 'EMPLOYEES': {
                csvRows.push('Name,Email,Role,Active')
                const emps = await prisma.user.findMany({
                    where: { franchiseId: user.franchiseId },
                    select: { name: true, email: true, role: true, isActive: true },
                    orderBy: { name: 'asc' }
                })
                for (const emp of emps) {
                    csvRows.push(`"${emp.name || ''}",${emp.email},${emp.role},${emp.isActive}`)
                }
                break
            }
            default:
                return NextResponse.json({ error: 'Invalid reportType. Use: TRANSACTIONS, ITEMS, INVENTORY, EMPLOYEES' }, { status: 400 })
        }

        const csv = csvRows.join('\n')

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${reportType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv"`
            }
        })
    } catch (error) {
        console.error('[CSV_EXPORT_POST]', error)
        return NextResponse.json({ error: 'Failed to export' }, { status: 500 })
    }
}
