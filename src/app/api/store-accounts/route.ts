import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'
import { logActivity } from '@/lib/auditLog'

// GET - Get all store accounts with balances and pagination
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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
            return NextResponse.json({ accounts: [], totals: { totalAccounts: 0, totalOutstanding: 0, accountsWithBalance: 0 } })
        }

        const searchParams = req.nextUrl.searchParams
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

        return NextResponse.json({
            accounts,
            totals: { totalAccounts: totalCount, totalOutstanding: 0, accountsWithBalance: outstandingCount },
            pagination: { nextCursor, hasMore, total: totalCount }
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed to fetch store accounts' }, { status: 500 })
    }
}

// POST - Create new store account for customer
export async function POST(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise assigned' }, { status: 403 })
        }

        const body = await req.json()
        const { clientId, creditLimit } = body

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID required' }, { status: 422 })
        }

        // SECURITY: Verify client belongs to user's franchise before modifying
        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
            select: { franchiseId: true }
        })

        if (!existingClient) {
            return NextResponse.json({ error: 'Client' }, { status: 404 })
        }

        if (existingClient.franchiseId !== user.franchiseId) {
            console.error(`[SECURITY] IDOR attempt: User ${user.id} tried to modify client ${clientId}`)
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const client = await prisma.client.update({
            where: { id: clientId },
            data: {
                hasStoreAccount: true,
                storeAccountBalance: 0,
                storeAccountLimit: creditLimit || 500,
                storeAccountApprovedBy: user.id,
                storeAccountApprovedAt: new Date()
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'USER',
            action: 'STORE_ACCOUNT_CREATED',
            entityType: 'Client',
            entityId: clientId,
            metadata: { creditLimit: creditLimit || 500 }
        })

        return NextResponse.json({
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            limit: Number(client.storeAccountLimit, { status: 201 })
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed to create store account' }, { status: 500 })
    }
}
