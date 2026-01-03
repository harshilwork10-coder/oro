import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Transaction Log for Franchisor
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user || !['OWNER', 'FRANCHISOR', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')
        const period = searchParams.get('period') || 'today'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const franchiseId = user.franchiseId

        // Calculate date range
        const now = new Date()
        let startDate: Date

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                break
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        }

        // Build where clause
        const where: any = {
            createdAt: { gte: startDate },
            ...(franchiseId ? { franchiseId } : {}),
        }

        if (locationId && locationId !== 'all') {
            where.cashDrawerSession = { locationId }
        }

        // Get total count
        const totalCount = await prisma.transaction.count({ where })

        // Get transactions with pagination
        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                employee: { select: { name: true } },
                client: { select: { firstName: true, lastName: true, phone: true } },
                cashDrawerSession: {
                    select: { location: { select: { name: true } } }
                },
                itemLineItems: {
                    take: 3,
                    include: { item: { select: { name: true } } }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        })

        // Format for display
        const formattedTransactions = transactions.map(tx => ({
            id: tx.id,
            invoiceNumber: tx.invoiceNumber,
            dateTime: tx.createdAt,
            location: tx.cashDrawerSession?.location?.name || 'Unknown',
            employee: tx.employee?.name || 'Unknown',
            customer: tx.client ? `${tx.client.firstName} ${tx.client.lastName}` : 'Walk-in',
            customerPhone: tx.client?.phone,
            subtotal: Number(tx.subtotal),
            tax: Number(tx.tax),
            total: Number(tx.total),
            tip: Number(tx.tip || 0),
            paymentMethod: tx.paymentMethod,
            status: tx.status,
            itemCount: tx.itemLineItems.length,
            itemPreview: tx.itemLineItems.slice(0, 3).map(i => i.item?.name || 'Item').join(', ')
        }))

        return NextResponse.json({
            transactions: formattedTransactions,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            },
            period,
            dateRange: {
                start: startDate.toISOString(),
                end: now.toISOString()
            }
        })

    } catch (error) {
        console.error('Transaction Log error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

