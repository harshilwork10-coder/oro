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
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const startDateTime = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        startDateTime.setHours(0, 0, 0, 0)
        const endDateTime = endDate ? new Date(endDate) : new Date()
        endDateTime.setHours(23, 59, 59, 999)

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ sold: { count: 0, total: 0 }, redeemed: { count: 0, total: 0 }, outstanding: 0, cards: [] })
        }

        // Get gift cards
        const giftCards = await prisma.giftCard.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: startDateTime, lte: endDateTime }
            },
            orderBy: { createdAt: 'desc' }
        })

        const sold = {
            count: giftCards.length,
            total: giftCards.reduce((sum, gc) => sum + Number(gc.initialAmount), 0)
        }

        const outstanding = giftCards.reduce((sum, gc) => sum + Number(gc.currentBalance), 0)
        const redeemed = {
            count: giftCards.filter(gc => Number(gc.currentBalance) < Number(gc.initialAmount)).length,
            total: sold.total - outstanding
        }

        const cards = giftCards.map(gc => ({
            id: gc.id,
            code: gc.code,
            initialAmount: Number(gc.initialAmount),
            currentBalance: Number(gc.currentBalance),
            purchaseDate: new Date(gc.createdAt).toLocaleDateString('en-US'),
            status: Number(gc.currentBalance) > 0 ? 'Active' : 'Empty'
        }))

        return NextResponse.json({ sold, redeemed, outstanding, cards })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

