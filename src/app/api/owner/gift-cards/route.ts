import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function generateGiftCardCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) code += '-'
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code // Format: XXXX-XXXX-XXXX-XXXX
}

// GET - Search gift cards, view stats
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const type = searchParams.get('type') || 'stats' // stats, search, recent

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        if (type === 'search' && code) {
            // Search for gift card by code
            const giftCard = await prisma.giftCard.findUnique({
                where: { code: code.toUpperCase().replace(/[^A-Z0-9]/g, '') },
                select: {
                    id: true,
                    code: true,
                    initialAmount: true,
                    currentBalance: true,
                    purchaserId: true,
                    recipientEmail: true,
                    isActive: true,
                    expiresAt: true,
                    createdAt: true,
                    franchise: { select: { id: true, name: true } }
                }
            })

            if (!giftCard) {
                return NextResponse.json({ found: false })
            }

            // Check if card belongs to this franchise or is cross-store valid
            const isOwnFranchise = franchiseId && giftCard.franchise.id === franchiseId

            return NextResponse.json({
                found: true,
                giftCard: {
                    ...giftCard,
                    initialAmount: Number(giftCard.initialAmount),
                    currentBalance: Number(giftCard.currentBalance),
                    isOwnFranchise,
                    isExpired: giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()
                }
            })
        }

        if (type === 'stats') {
            // Get gift card stats
            const where = franchiseId ? { franchiseId } : {}

            const totalCards = await prisma.giftCard.count({ where })

            const activeCards = await prisma.giftCard.count({
                where: { ...where, isActive: true, currentBalance: { gt: 0 } }
            })

            const balanceResult = await prisma.giftCard.aggregate({
                where,
                _sum: { initialAmount: true, currentBalance: true }
            })

            const recentCards = await prisma.giftCard.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    code: true,
                    initialAmount: true,
                    currentBalance: true,
                    isActive: true,
                    createdAt: true
                }
            })

            return NextResponse.json({
                stats: {
                    totalCards,
                    activeCards,
                    totalIssued: Number(balanceResult._sum.initialAmount || 0),
                    totalOutstanding: Number(balanceResult._sum.currentBalance || 0),
                    totalRedeemed: Number(balanceResult._sum.initialAmount || 0) - Number(balanceResult._sum.currentBalance || 0)
                },
                recentCards: recentCards.map(c => ({
                    ...c,
                    initialAmount: Number(c.initialAmount),
                    currentBalance: Number(c.currentBalance)
                }))
            })
        }

        return NextResponse.json({})

    } catch (error) {
        console.error('Gift card GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Issue new card, check balance, redeem
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { action, code, amount, recipientEmail, purchaserId } = body
        // action: 'issue', 'redeem', 'check'

        const franchiseId = user.franchiseId
        if (!franchiseId && action !== 'check') {
            return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
        }

        if (action === 'issue') {
            if (!amount || amount <= 0) {
                return NextResponse.json({ error: 'Amount required' }, { status: 400 })
            }

            // Generate unique code
            let newCode = generateGiftCardCode()
            let attempts = 0
            while (attempts < 10) {
                const existing = await prisma.giftCard.findUnique({ where: { code: newCode } })
                if (!existing) break
                newCode = generateGiftCardCode()
                attempts++
            }

            const giftCard = await prisma.giftCard.create({
                data: {
                    franchiseId,
                    code: newCode,
                    initialAmount: amount,
                    currentBalance: amount,
                    recipientEmail,
                    purchaserId: purchaserId || user.id,
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
                }
            })

            return NextResponse.json({
                success: true,
                giftCard: {
                    id: giftCard.id,
                    code: giftCard.code,
                    amount: Number(giftCard.initialAmount),
                    expiresAt: giftCard.expiresAt
                }
            })
        }

        if (action === 'check') {
            if (!code) {
                return NextResponse.json({ error: 'Code required' }, { status: 400 })
            }

            const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
            const giftCard = await prisma.giftCard.findUnique({
                where: { code: cleanCode }
            })

            if (!giftCard) {
                return NextResponse.json({ error: 'Card not found' }, { status: 404 })
            }

            if (!giftCard.isActive) {
                return NextResponse.json({ error: 'Card is deactivated' }, { status: 400 })
            }

            if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
                return NextResponse.json({ error: 'Card is expired' }, { status: 400 })
            }

            return NextResponse.json({
                success: true,
                balance: Number(giftCard.currentBalance),
                code: giftCard.code
            })
        }

        if (action === 'redeem') {
            if (!code || !amount) {
                return NextResponse.json({ error: 'Code and amount required' }, { status: 400 })
            }

            const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
            const giftCard = await prisma.giftCard.findUnique({
                where: { code: cleanCode }
            })

            if (!giftCard) {
                return NextResponse.json({ error: 'Card not found' }, { status: 404 })
            }

            if (!giftCard.isActive) {
                return NextResponse.json({ error: 'Card is deactivated' }, { status: 400 })
            }

            if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
                return NextResponse.json({ error: 'Card is expired' }, { status: 400 })
            }

            const currentBalance = Number(giftCard.currentBalance)
            if (currentBalance < amount) {
                return NextResponse.json({
                    error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}`,
                    balance: currentBalance
                }, { status: 400 })
            }

            // Deduct amount
            await prisma.giftCard.update({
                where: { id: giftCard.id },
                data: { currentBalance: { decrement: amount } }
            })

            return NextResponse.json({
                success: true,
                redeemed: amount,
                newBalance: currentBalance - amount,
                code: giftCard.code
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Gift card POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT - Deactivate/reactivate card
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { cardId, isActive } = body

        if (!cardId) {
            return NextResponse.json({ error: 'Card ID required' }, { status: 400 })
        }

        const giftCard = await prisma.giftCard.findUnique({
            where: { id: cardId }
        })

        if (!giftCard) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 })
        }

        // Verify franchise access
        if (user.role !== 'PROVIDER' && giftCard.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        await prisma.giftCard.update({
            where: { id: cardId },
            data: { isActive }
        })

        return NextResponse.json({
            success: true,
            message: isActive ? 'Card activated' : 'Card deactivated'
        })

    } catch (error) {
        console.error('Gift card PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
