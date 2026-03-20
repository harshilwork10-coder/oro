/**
 * RMSC Imported Records (paginated)
 *
 * GET /api/tobacco-scan/rmsc-import/records?page=0&limit=50
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
        const page = parseInt(searchParams.get('page') || '0')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

        const locations = await prisma.location.findMany({
            where: { franchise: { id: user.franchiseId } },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        const records = await prisma.rmscScanRecord.findMany({
            where: { locationId: { in: locationIds } },
            orderBy: [{ transactionDate: 'desc' }, { sourceRowNumber: 'asc' }],
            skip: page * limit,
            take: limit,
            select: {
                id: true,
                sourceRowNumber: true,
                transactionDate: true,
                basketId: true,
                upc: true,
                productDescription: true,
                manufacturerName: true,
                quantity: true,
                unitPrice: true,
                buydownAmount: true,
                promoType: true,
                loyaltyFlag: true,
                multipackFlag: true,
            }
        })

        return ApiResponse.success({
            records: records.map(r => ({
                ...r,
                transactionDate: r.transactionDate?.toISOString() || null,
                quantity: r.quantity ? Number(r.quantity) : null,
                unitPrice: r.unitPrice ? Number(r.unitPrice) : null,
                buydownAmount: r.buydownAmount ? Number(r.buydownAmount) : null,
            })),
            page,
            limit,
        })
    } catch (error) {
        console.error('[RMSC_RECORDS]', error)
        return ApiResponse.error('Failed to fetch imported records', 500)
    }
}
