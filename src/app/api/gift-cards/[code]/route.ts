import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get gift card by code
export async function GET(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const giftCard = await prisma.giftCard.findUnique({
            where: { code }
        })

        if (!giftCard) {
            return NextResponse.json({ error: 'Gift card not found' }, { status: 404 })
        }

        return NextResponse.json(giftCard)
    } catch (error) {
        console.error('Error fetching gift card:', error)
        return NextResponse.json({ error: 'Failed to fetch gift card' }, { status: 500 })
    }
}

// Redeem gift card
export async function POST(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { amount } = body

        const giftCard = await prisma.giftCard.findUnique({
            where: { code }
        })

        if (!giftCard) {
            return NextResponse.json({ error: 'Gift card not found' }, { status: 404 })
        }

        if (!giftCard.isActive) {
            return NextResponse.json({ error: 'Gift card is inactive' }, { status: 400 })
        }

        const currentBalance = Number(giftCard.currentBalance)
        if (currentBalance < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
        }

        // Update balance
        const updated = await prisma.giftCard.update({
            where: { code },
            data: {
                currentBalance: currentBalance - amount
            }
        })

        console.log(`✅ Gift card redeemed: ${code} - $${amount} (Remaining: $${updated.currentBalance})`)

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error redeeming gift card:', error)
        return NextResponse.json({ error: 'Failed to redeem gift card' }, { status: 500 })
    }
}
