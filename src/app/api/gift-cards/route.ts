import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const franchiseId = searchParams.get('franchiseId')

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
        }

        const giftCards = await prisma.giftCard.findMany({
            where: { franchiseId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(giftCards)
    } catch (error) {
        console.error('Error fetching gift cards:', error)
        return NextResponse.json({ error: 'Failed to fetch gift cards' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { franchiseId, initialAmount, recipientEmail, purchaserId } = body

        if (!franchiseId || !initialAmount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Generate unique code
        const code = `GC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        const giftCard = await prisma.giftCard.create({
            data: {
                code,
                franchiseId,
                initialAmount: parseFloat(initialAmount),
                currentBalance: parseFloat(initialAmount),
                recipientEmail: recipientEmail || null,
                purchaserId: purchaserId || null,
                isActive: true
            }
        })

        console.log(`✅ Gift card created: ${code} - $${initialAmount}`)

        return NextResponse.json(giftCard)
    } catch (error) {
        console.error('Error creating gift card:', error)
        return NextResponse.json({ error: 'Failed to create gift card' }, { status: 500 })
    }
}
