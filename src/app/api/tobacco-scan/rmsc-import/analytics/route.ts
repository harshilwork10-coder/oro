/**
 * RMSC Import Analytics
 *
 * GET /api/tobacco-scan/rmsc-import/analytics
 *
 * Returns aggregated analytics for imported RMSC scan data:
 * - Total records, total buydown
 * - By manufacturer: count + buydown
 * - By promo type: count
 * - Loyalty vs non-loyalty
 * - Multipack vs single
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

        const locations = await prisma.location.findMany({
            where: { franchise: { id: user.franchiseId } },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        const where = { locationId: { in: locationIds } }

        // Run all queries in parallel
        const [
            totalRecords,
            loyaltyCount,
            multipackCount,
            byManufacturerRaw,
            byPromoTypeRaw,
            buydownAgg,
        ] = await Promise.all([
            prisma.rmscScanRecord.count({ where }),
            prisma.rmscScanRecord.count({ where: { ...where, loyaltyFlag: true } }),
            prisma.rmscScanRecord.count({ where: { ...where, multipackFlag: true } }),
            prisma.rmscScanRecord.groupBy({
                by: ['manufacturerName'],
                where,
                _count: { id: true },
                _sum: { buydownAmount: true },
            }),
            prisma.rmscScanRecord.groupBy({
                by: ['promoType'],
                where,
                _count: { id: true },
            }),
            prisma.rmscScanRecord.aggregate({
                where,
                _sum: { buydownAmount: true },
            }),
        ])

        const byManufacturer = byManufacturerRaw.map(m => ({
            name: m.manufacturerName || 'UNKNOWN',
            count: m._count.id,
            buydown: m._sum.buydownAmount ? Number(m._sum.buydownAmount) : 0,
        })).sort((a, b) => b.count - a.count)

        const byPromoType = byPromoTypeRaw.map(p => ({
            type: p.promoType || 'NO PROMO',
            count: p._count.id,
        })).sort((a, b) => b.count - a.count)

        // Also get recent import batch stats
        const recentBatches = await prisma.rmscImportBatch.findMany({
            where: { locationId: { in: locationIds } },
            orderBy: { importedAt: 'desc' },
            take: 5,
            select: {
                id: true,
                fileName: true,
                importedRows: true,
                duplicateRows: true,
                errorRows: true,
                status: true,
                importedAt: true,
            }
        })

        return ApiResponse.success({
            totalRecords,
            totalBuydownAmount: buydownAgg._sum.buydownAmount
                ? Math.round(Number(buydownAgg._sum.buydownAmount) * 100) / 100
                : 0,
            byManufacturer,
            byPromoType,
            loyaltyCount,
            multipackCount,
            singleCount: totalRecords - multipackCount,
            recentBatches: recentBatches.map(b => ({
                ...b,
                importedAt: b.importedAt.toISOString(),
            })),
        })
    } catch (error) {
        console.error('[RMSC_ANALYTICS]', error)
        return ApiResponse.error('Failed to compute analytics', 500)
    }
}
