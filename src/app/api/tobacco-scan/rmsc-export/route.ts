/**
 * RMSC Scan Data CSV Export
 *
 * GET /api/tobacco-scan/rmsc-export?locationId=...&weekStart=2026-03-02
 *
 * Returns text/csv file with RMSC 34-field format generated from POS transactions.
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    generateRmscCsv,
    buildRmscRows,
    type RmscStoreInfo,
    type TobaccoExportTxn,
    type TobaccoDealMatch,
} from '@/lib/rmsc-export'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return new Response('Unauthorized', { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })
        if (!user?.franchiseId) {
            return new Response('No franchise', { status: 400 })
        }

        const { searchParams } = new URL(request.url)
        const weekStartStr = searchParams.get('weekStart')
        const locationIdParam = searchParams.get('locationId')

        // Calculate week range
        let startOfWeek: Date
        if (weekStartStr) {
            startOfWeek = new Date(weekStartStr)
        } else {
            const now = new Date()
            startOfWeek = new Date(now)
            startOfWeek.setDate(now.getDate() - now.getDay())
        }
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        // Resolve location
        const location = await prisma.location.findFirst({
            where: locationIdParam
                ? { id: locationIdParam, franchise: { id: user.franchiseId } }
                : { franchise: { id: user.franchiseId } }
        })

        if (!location) {
            return new Response('Location not found', { status: 400 })
        }

        // Build store info from Location
        const fullAddress = location.address || ''
        const addressParts = fullAddress.split(',').map(s => s.trim())
        const store: RmscStoreInfo = {
            outletName: location.name || 'Store',
            outletNumber: location.id.substring(0, 8),
            address1: addressParts[0] || '',
            address2: '',
            city: addressParts[1] || '',
            state: addressParts[2]?.split(' ')[0] || '',
            zip: addressParts[2]?.split(' ')[1] || '',
        }

        // Get tobacco transactions for the week
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfWeek,
                    lte: endOfWeek,
                }
            },
            include: {
                lineItems: {
                    where: { type: 'PRODUCT' },
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        // Get active deals for promo matching
        const tobaccoDeals = await prisma.tobaccoDeal.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                startDate: { lte: endOfWeek },
                OR: [
                    { endDate: null },
                    { endDate: { gte: startOfWeek } }
                ]
            }
        })

        const dealMatches: TobaccoDealMatch[] = tobaccoDeals.map(d => ({
            manufacturer: d.manufacturer,
            dealName: d.dealName,
            dealType: d.dealType,
            discountAmount: Number(d.discountAmount),
        }))

        // Build RMSC rows from transactions
        const txnData: TobaccoExportTxn[] = transactions.map(t => ({
            id: t.id,
            createdAt: t.createdAt,
            stationId: (t as any).stationId,
            lineItems: t.lineItems.map(li => ({
                product: li.product ? {
                    barcode: li.product.barcode,
                    sku: li.product.sku,
                    name: li.product.name,
                    isTobacco: (li.product as any).isTobacco,
                    unitOfMeasure: (li.product as any).unitOfMeasure,
                } : null,
                quantity: li.quantity,
                price: li.price,
                discount: li.discount,
                discountReason: (li as any).discountReason,
            }))
        }))

        const rows = buildRmscRows(store, txnData, dealMatches)
        const csv = generateRmscCsv(store, rows)

        // Format filename
        const weekStr = `${startOfWeek.getFullYear()}${String(startOfWeek.getMonth() + 1).padStart(2, '0')}${String(startOfWeek.getDate()).padStart(2, '0')}`
        const fileName = `rmsc-scan-${weekStr}.csv`

        return new Response(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'X-Record-Count': String(rows.length),
            }
        })
    } catch (error) {
        console.error('[RMSC_EXPORT]', error)
        return new Response('Failed to export RMSC scan data', { status: 500 })
    }
}
