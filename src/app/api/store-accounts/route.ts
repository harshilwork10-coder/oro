import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get all store accounts with balances
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ accounts: [] })
        }

        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter') || 'all' // all, outstanding, zero

        let whereClause: any = {
            franchiseId: user.franchiseId,
            hasStoreAccount: true
        }

        if (filter === 'outstanding') {
            whereClause.storeAccountBalance = { gt: 0 }
        } else if (filter === 'zero') {
            whereClause.storeAccountBalance = { equals: 0 }
        }

        const clients = await prisma.client.findMany({
            where: whereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                storeAccountBalance: true,
                storeAccountLimit: true,
                storeAccountApprovedAt: true,
                _count: {
                    select: { storeAccountTransactions: true }
                }
            },
            orderBy: { storeAccountBalance: 'desc' }
        })

        const accounts = clients.map(c => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            phone: c.phone || '',
            email: c.email || '',
            balance: Number(c.storeAccountBalance),
            limit: Number(c.storeAccountLimit),
            transactionCount: c._count.storeAccountTransactions,
            approvedAt: c.storeAccountApprovedAt
        }))

        const totals = {
            totalAccounts: accounts.length,
            totalOutstanding: accounts.reduce((sum, a) => sum + a.balance, 0),
            accountsWithBalance: accounts.filter(a => a.balance > 0).length
        }

        return NextResponse.json({ accounts, totals })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

// POST - Create new store account for customer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // SECURITY: Get user's franchiseId
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise assigned' }, { status: 403 })
        }

        const body = await request.json()
        const { clientId, creditLimit } = body

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
        }

        // SECURITY: Verify client belongs to user's franchise before modifying
        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
            select: { franchiseId: true }
        })

        if (!existingClient) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        if (existingClient.franchiseId !== user.franchiseId) {
            console.warn(`[SECURITY] IDOR attempt: User ${session.user.id} tried to modify client ${clientId}`)
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

        return NextResponse.json({
            success: true,
            message: 'Store account created',
            client: {
                id: client.id,
                name: `${client.firstName} ${client.lastName}`,
                limit: Number(client.storeAccountLimit)
            }
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

