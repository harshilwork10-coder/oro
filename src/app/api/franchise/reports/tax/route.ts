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
        const whereClause: any = {
            franchiseId: user.franchiseId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'COMPLETED'
        }
        if (locationId) whereClause.locationId = locationId

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            select: { total: true, tax: true }
        })

        const totalTaxCollected = transactions.reduce((sum, tx: any) => sum + Number(tx.tax), 0)
        const taxableRevenue = transactions.reduce((sum, tx: any) => sum + Number(tx.total), 0)
        const effectiveRate = taxableRevenue > 0 ? (totalTaxCollected / taxableRevenue) * 100 : 0

        return NextResponse.json({
            totalTaxCollected,
            salesTax: totalTaxCollected,
            otherTax: 0,
            taxableRevenue,
            exemptRevenue: 0,
            effectiveRate: Number(effectiveRate.toFixed(2))
        })

    } catch (error) {
        console.error('Error generating tax report:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
