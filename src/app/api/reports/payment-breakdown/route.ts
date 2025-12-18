import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

        const startDateTime = new Date(startDate)
        startDateTime.setHours(0, 0, 0, 0)
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ breakdown: [], totals: { count: 0, total: 0 } })
        }

        // Group transactions by payment method
        const transactions = await prisma.transaction.groupBy({
            by: ['paymentMethod'],
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startDateTime, lte: endDateTime },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            _count: { id: true },
            _sum: { total: true }
        })

        const grandTotal = transactions.reduce((sum, t) => sum + Number(t._sum.total || 0), 0)
        const grandCount = transactions.reduce((sum, t) => sum + t._count.id, 0)

        const breakdown = transactions.map(t => ({
            method: t.paymentMethod || 'UNKNOWN',
            count: t._count.id,
            total: Number(t._sum.total || 0),
            percentage: grandTotal > 0 ? (Number(t._sum.total || 0) / grandTotal) * 100 : 0
        })).sort((a, b) => b.total - a.total)

        return NextResponse.json({
            breakdown,
            totals: { count: grandCount, total: grandTotal }
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
