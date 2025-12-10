import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const locationId = searchParams.get('locationId')

    const now = new Date()
    let startOfDay = new Date(now)
    let endOfDay = new Date(now)

    if (startDateParam && endDateParam) {
        startOfDay = new Date(startDateParam)
        endOfDay = new Date(endDateParam)
    }
    startOfDay.setHours(0, 0, 0, 0)
    endOfDay.setHours(23, 59, 59, 999)

    try {
        // Get total customers for the franchise
        const totalCustomers = await prisma.client.count({
            where: { franchiseId: user.franchiseId }
        })

        // Get new customers in the date range
        const newThisMonth = await prisma.client.count({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startOfDay, lte: endOfDay }
            }
        })

        // Get transactions with client info
        const txWhereClause: any = {
            franchiseId: user.franchiseId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'COMPLETED',
            clientId: { not: null }
        }
        if (locationId) txWhereClause.locationId = locationId

        const transactions = await prisma.transaction.findMany({
            where: txWhereClause,
            include: { client: true }
        })

        // Calculate top spenders
        const clientSpending: Record<string, { name: string; spent: number; visits: number }> = {}
        transactions.forEach((tx: any) => {
            if (tx.client) {
                const cid = tx.client.id
                if (!clientSpending[cid]) {
                    clientSpending[cid] = {
                        name: `${tx.client.firstName || ''} ${tx.client.lastName || ''}`.trim() || 'Unknown',
                        spent: 0,
                        visits: 0
                    }
                }
                clientSpending[cid].spent += Number(tx.total)
                clientSpending[cid].visits += 1
            }
        })

        const topCustomers = Object.values(clientSpending)
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 5)

        const uniqueCustomers = Object.keys(clientSpending).length
        const totalSpent = transactions.reduce((sum, tx: any) => sum + Number(tx.total), 0)
        const avgSpend = uniqueCustomers > 0 ? totalSpent / uniqueCustomers : 0

        // Calculate returning percentage (customers with more than 1 visit)
        const returningCount = Object.values(clientSpending).filter(c => c.visits > 1).length
        const returning = uniqueCustomers > 0 ? (returningCount / uniqueCustomers) * 100 : 0

        return NextResponse.json({
            totalCustomers,
            newThisMonth,
            returning: Number(returning.toFixed(0)),
            avgSpend: Number(avgSpend.toFixed(2)),
            topCustomers
        })

    } catch (error) {
        console.error('Error generating customers report:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
