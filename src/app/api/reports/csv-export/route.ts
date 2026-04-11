/**
 * CSV Export API
 *
 * POST — Export report data as CSV download
 * Supports: TRANSACTIONS, PRODUCTS, INVENTORY, EMPLOYEES
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const franchiseId = user.franchiseId

        const body = await req.json()
        const { reportType, dateFrom, dateTo } = body as {
            reportType: string
            dateFrom?: string
            dateTo?: string
        }

        const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000)
        const to = dateTo ? new Date(dateTo) : new Date()

        const csvRows: string[] = []

        switch (reportType) {
            case 'TRANSACTIONS': {
                csvRows.push('Date,Time,Transaction ID,Employee,Payment Method,Subtotal,Tax,Total,Status')
                const txs = await prisma.transaction.findMany({
                    where: { franchiseId, createdAt: { gte: from, lte: to } },
                    include: { employee: { select: { firstName: true, lastName: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 5000
                })
                for (const tx of txs) {
                    const d = new Date(tx.createdAt)
                    const empName = tx.employee ? `${tx.employee.firstName || ''} ${tx.employee.lastName || ''}`.trim() : ''
                    csvRows.push(`${d.toLocaleDateString()},${d.toLocaleTimeString()},${tx.id},"${empName}",${tx.paymentMethod},${tx.subtotal},${tx.tax || 0},${tx.total},${tx.status}`)
                }
                break
            }
            case 'PRODUCTS': {
                csvRows.push('Name,Barcode,SKU,Price,Cost,Stock,Category,Active')
                const products = await prisma.product.findMany({
                    where: { franchiseId },
                    include: { productCategory: { select: { name: true } } },
                    orderBy: { name: 'asc' },
                    take: 10000
                })
                for (const p of products) {
                    csvRows.push(`"${p.name}",${p.barcode || ''},${p.sku || ''},${p.price},${p.cost || 0},${p.stock || 0},"${p.productCategory?.name || ''}",${p.isActive}`)
                }
                break
            }
            case 'INVENTORY': {
                csvRows.push('Name,Barcode,Stock,Cost,Stock Value,Reorder Point,Min Stock')
                const inv = await prisma.product.findMany({
                    where: { franchiseId, isActive: true },
                    orderBy: { name: 'asc' },
                    take: 10000
                })
                for (const p of inv) {
                    const stockValue = (p.stock || 0) * Number(p.cost || 0)
                    csvRows.push(`"${p.name}",${p.barcode || ''},${p.stock || 0},${p.cost || 0},${stockValue.toFixed(2)},${p.reorderPoint || ''},${p.minStock || ''}`)
                }
                break
            }
            case 'EMPLOYEES': {
                csvRows.push('First Name,Last Name,Email,Role,Active')
                const emps = await prisma.user.findMany({
                    where: { franchiseId },
                    select: { firstName: true, lastName: true, email: true, role: true, isActive: true },
                    orderBy: { firstName: 'asc' }
                })
                for (const emp of emps) {
                    csvRows.push(`"${emp.firstName || ''}","${emp.lastName || ''}",${emp.email},${emp.role},${emp.isActive}`)
                }
                break
            }
            default:
                return NextResponse.json({ error: 'Invalid reportType. Use: TRANSACTIONS, PRODUCTS, INVENTORY, EMPLOYEES' }, { status: 400 })
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
