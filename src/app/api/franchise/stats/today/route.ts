import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const authUser = await getAuthUser(request)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        // Get start of today
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Fetch transactions for today
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: {
                    gte: today
                },
                status: 'COMPLETED'
            },
            include: {
                lineItems: true
            }
        })

        // Calculate stats
        const visits = transactions.length

        const revenue = transactions.reduce((sum, tx) => sum + Number(tx.total), 0)

        const services = transactions.reduce((count, tx) => {
            const serviceItems = tx.lineItems.filter(item => item.type === 'service')
            return count + serviceItems.length
        }, 0)

        return NextResponse.json({
            visits,
            revenue,
            services
        })

    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

