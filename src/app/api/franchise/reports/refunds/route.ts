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
        // Get refunded transactions
        const refundWhereClause: any = {
            franchiseId: user.franchiseId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'REFUNDED'
        }
        if (locationId) refundWhereClause.locationId = locationId

        const refundedTxs = await prisma.transaction.findMany({
            where: refundWhereClause,
            include: { employee: true },
            orderBy: { createdAt: 'desc' }
        })

        // Get voided transactions
        const voidWhereClause: any = {
            franchiseId: user.franchiseId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'VOIDED'
        }
        if (locationId) voidWhereClause.locationId = locationId

        const voidedTxs = await prisma.transaction.findMany({
            where: voidWhereClause,
            include: { employee: true }
        })

        const totalRefunds = refundedTxs.length
        const refundAmount = refundedTxs.reduce((sum, tx: any) => sum + Number(tx.total), 0)
        const voids = voidedTxs.length
        const voidAmount = voidedTxs.reduce((sum, tx: any) => sum + Number(tx.total), 0)

        const refundsList = refundedTxs.slice(0, 10).map((tx: any) => ({
            date: tx.createdAt.toISOString().split('T')[0],
            amount: Number(tx.total),
            reason: tx.refundReason || 'No reason provided',
            employee: tx.employee?.name || 'Unknown'
        }))

        return NextResponse.json({
            totalRefunds,
            refundAmount,
            voids,
            voidAmount,
            refundsList
        })

    } catch (error) {
        console.error('Error generating refunds report:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

