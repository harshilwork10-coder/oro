/**
 * RMSC Imported Records (paginated)
 *
 * GET /api/tobacco-scan/rmsc-import/records?page=0&limit=50
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
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

        return NextResponse.json({
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
        return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
    }
}
