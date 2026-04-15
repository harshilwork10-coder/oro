import { withPOSAuth } from '@/lib/posAuth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'

export const GET = withPOSAuth(async (req, ctx) => {
    const { franchiseId } = ctx

    try {
        const searchParams = new URL(req.url).searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)

        // Filters
        const status = searchParams.get('status') || 'COMPLETED'
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')
        const employeeId = searchParams.get('employeeId')
        const locationId = searchParams.get('locationId')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId
        }

        if (status !== 'all') {
            whereClause.status = status
        }

        if (dateFrom) {
            whereClause.createdAt = {
                ...(whereClause.createdAt as object || {}),
                gte: new Date(dateFrom)
            }
        }
        if (dateTo) {
            whereClause.createdAt = {
                ...(whereClause.createdAt as object || {}),
                lte: new Date(dateTo + 'T23:59:59')
            }
        }

        if (employeeId) whereClause.employeeId = employeeId
        if (locationId) whereClause.locationId = locationId

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                lineItems: true,
                employee: { select: { name: true } },
                client: { select: { firstName: true, lastName: true } },
                // P0 SOP: For "View Original" / "View Refund(s)" links
                originalTransaction: { select: { id: true, invoiceNumber: true } },
                refunds: { select: { id: true, invoiceNumber: true, total: true, createdAt: true } }
            },
            orderBy: orderBy || { createdAt: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const transactions = await prisma.transaction.findMany(
            queryArgs as Parameters<typeof prisma.transaction.findMany>[0]
        )

        const hasMore = transactions.length > (take || 50)
        const data = hasMore ? transactions.slice(0, take || 50) : transactions
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('[POS_TRANSACTIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }
})
