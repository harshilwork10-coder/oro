import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Customer Retention API
 * Returns customer growth and retention metrics
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId') // Optional filter

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                franchisorMemberships: {
                    include: { franchisor: true }
                }
            }
        }) as any

        const franchisorId = user?.franchisorMemberships?.[0]?.franchisor?.id
        if (!franchisorId) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Date ranges
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

        // Get locations
        const locations = await prisma.location.findMany({
            where: {
                franchisorId,
                ...(locationId ? { id: locationId } : {})
            },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        // Get all transactions with client info
        const transactions = await prisma.transaction.findMany({
            where: {
                locationId: { in: locationIds },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] },
                clientId: { not: null }
            },
            select: {
                id: true,
                clientId: true,
                total: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' }
        })

        // Build customer visit history
        const customerVisits: Record<string, Date[]> = {}
        transactions.forEach(t => {
            if (t.clientId) {
                if (!customerVisits[t.clientId]) customerVisits[t.clientId] = []
                customerVisits[t.clientId].push(t.createdAt)
            }
        })

        const allCustomerIds = Object.keys(customerVisits)
        const totalCustomers = allCustomerIds.length

        // This month customers
        const thisMonthCustomers = new Set(
            transactions.filter(t => t.createdAt >= thisMonth && t.clientId).map(t => t.clientId!)
        )

        // New vs Returning - new = first visit in this month
        let newCustomers = 0
        let returningCustomers = 0
        thisMonthCustomers.forEach(customerId => {
            const visits = customerVisits[customerId]
            const firstVisit = visits[0]
            if (firstVisit >= thisMonth) {
                newCustomers++
            } else {
                returningCustomers++
            }
        })

        // Repeat rates (customers who visited again within X days)
        function getRepeatRate(days: number): number {
            let repeated = 0
            let eligible = 0
            allCustomerIds.forEach(customerId => {
                const visits = customerVisits[customerId]
                for (let i = 0; i < visits.length - 1; i++) {
                    const daysBetween = (visits[i + 1].getTime() - visits[i].getTime()) / (1000 * 60 * 60 * 24)
                    if (daysBetween <= days) {
                        repeated++
                        break
                    }
                }
                eligible++
            })
            return eligible > 0 ? Math.round((repeated / eligible) * 100) : 0
        }

        // Average visits per customer
        const avgVisitsPerCustomer = totalCustomers > 0
            ? Math.round((transactions.length / totalCustomers) * 10) / 10
            : 0

        // Average spend per customer
        const totalSpend = transactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
        const avgSpendPerCustomer = totalCustomers > 0
            ? Math.round(totalSpend / totalCustomers)
            : 0

        // Lost customers (no visit in 60 days)
        const lostCustomers = allCustomerIds.filter(customerId => {
            const visits = customerVisits[customerId]
            const lastVisit = visits[visits.length - 1]
            return lastVisit < days60Ago
        }).length

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalCustomers,
                    thisMonthCustomers: thisMonthCustomers.size,
                    newCustomers,
                    returningCustomers,
                    lostCustomers,
                },
                metrics: {
                    repeatRate30: getRepeatRate(30),
                    repeatRate60: getRepeatRate(60),
                    repeatRate90: getRepeatRate(90),
                    avgVisitsPerCustomer,
                    avgSpendPerCustomer,
                },
            }
        })

    } catch (error) {
        console.error('Retention API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
