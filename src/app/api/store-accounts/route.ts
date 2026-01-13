import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET - Get all store accounts with balances and pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, role: true, franchiseId: true }
        })

        let franchiseId = user?.franchiseId

        if (user?.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        if (!franchiseId) {
            return ApiResponse.success({ accounts: [], totals: { totalAccounts: 0, totalOutstanding: 0, accountsWithBalance: 0 } })
        }

        const searchParams = request.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const filter = searchParams.get('filter') || 'all'
        const search = searchParams.get('search')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: franchiseId,
            hasStoreAccount: true
        }

        if (filter === 'outstanding') {
            whereClause.storeAccountBalance = { gt: 0 }
        } else if (filter === 'zero') {
            whereClause.storeAccountBalance = { equals: 0 }
        }

        if (search) {
            whereClause.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } }
            ]
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                storeAccountBalance: true,
                storeAccountLimit: true,
                storeAccountApprovedAt: true,
                _count: { select: { storeAccountTransactions: true } }
            },
            orderBy: orderBy || { storeAccountBalance: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const clients = await prisma.client.findMany(
            queryArgs as Parameters<typeof prisma.client.findMany>[0]
        )

        // Get totals (separate query for accurate counts)
        const [totalCount, outstandingCount] = await Promise.all([
            prisma.client.count({
                where: { franchiseId: franchiseId, hasStoreAccount: true }
            }),
            prisma.client.count({
                where: { franchiseId: franchiseId, hasStoreAccount: true, storeAccountBalance: { gt: 0 } }
            })
        ])

        const hasMore = clients.length > (take || 50)
        const data = hasMore ? clients.slice(0, take || 50) : clients

        const accounts = (data as any[]).map((c: any) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            phone: c.phone || '',
            email: c.email || '',
            balance: Number(c.storeAccountBalance),
            limit: Number(c.storeAccountLimit),
            transactionCount: c._count?.storeAccountTransactions || 0,
            approvedAt: c.storeAccountApprovedAt
        }))

        const nextCursor = hasMore && accounts.length > 0 ? accounts[accounts.length - 1].id : null

        return ApiResponse.success({
            accounts,
            totals: { totalAccounts: totalCount, totalOutstanding: 0, accountsWithBalance: outstandingCount },
            pagination: { nextCursor, hasMore, total: totalCount }
        })
    } catch (error) {
        console.error('Error:', error)
        return ApiResponse.serverError('Failed to fetch store accounts')
    }
}

// POST - Create new store account for customer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return ApiResponse.forbidden('No franchise assigned')
        }

        const body = await request.json()
        const { clientId, creditLimit } = body

        if (!clientId) {
            return ApiResponse.validationError('Client ID required')
        }

        // SECURITY: Verify client belongs to user's franchise before modifying
        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
            select: { franchiseId: true }
        })

        if (!existingClient) {
            return ApiResponse.notFound('Client')
        }

        if (existingClient.franchiseId !== user.franchiseId) {
            console.error(`[SECURITY] IDOR attempt: User ${session.user.id} tried to modify client ${clientId}`)
            return ApiResponse.forbidden('Access denied')
        }

        const client = await prisma.client.update({
            where: { id: clientId },
            data: {
                hasStoreAccount: true,
                storeAccountBalance: 0,
                storeAccountLimit: creditLimit || 500,
                storeAccountApprovedBy: session.user.id,
                storeAccountApprovedAt: new Date()
            }
        })

        return ApiResponse.created({
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            limit: Number(client.storeAccountLimit)
        })
    } catch (error) {
        console.error('Error:', error)
        return ApiResponse.serverError('Failed to create store account')
    }
}
