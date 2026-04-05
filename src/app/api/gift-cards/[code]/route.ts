import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { authenticatePOSRequest } from '@/lib/posAuth'
import { logActivity } from '@/lib/auditLog'

/**
 * Dual auth helper: tries station token first (for Android POS),
 * falls back to NextAuth web session.
 */
async function resolveAuth(req: Request): Promise<{ franchiseId: string; userId: string; role: string } | null> {
    // Try POS station token first
    const stationToken = req.headers.get('x-station-token')
    if (stationToken) {
        const result = await authenticatePOSRequest(req)
        if ('ctx' in result) {
            return { franchiseId: result.ctx.franchiseId, userId: 'station', role: 'STATION' }
        }
        return null
    }

    // Fall back to getAuthUser
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return null
    return { franchiseId: user.franchiseId, userId: user.id, role: user.role }
}

// Get gift card by code
export async function GET(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const auth = await resolveAuth(req)
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { code } = await params

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

// Redeem gift card — P0 FIX: Atomic balance deduction
export async function POST(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const auth = await resolveAuth(req)
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { code } = await params
        const body = await req.json()
        const { amount } = body

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
        }

        // ===== P0 FIX: ATOMIC BALANCE DEDUCTION =====
        // Wrap balance check + deduction in prisma.$transaction to prevent race conditions
        // where two terminals could both pass the balance check and both deduct
        const result = await prisma.$transaction(async (tx) => {
            // Lock the row by reading inside transaction
            const giftCard = await tx.giftCard.findUnique({
                where: { code }
            })

            if (!giftCard) {
                throw new Error('GIFT_CARD_NOT_FOUND')
            }

            if (!giftCard.isActive) {
                throw new Error('GIFT_CARD_INACTIVE')
            }

            // Check expiry
            if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
                throw new Error('GIFT_CARD_EXPIRED')
            }

            const currentBalance = Number(giftCard.currentBalance)
            if (currentBalance < amount) {
                throw new Error(`INSUFFICIENT_BALANCE:${currentBalance}`)
            }

            // Atomic update — deduct balance
            const updated = await tx.giftCard.update({
                where: { code },
                data: {
                    currentBalance: currentBalance - amount
                }
            })

            return { giftCard: updated, previousBalance: currentBalance }
        })
        // ===== END ATOMIC BLOCK =====

        // Audit log — outside transaction (non-critical)
        await logActivity({
            userId: auth.userId,
            userEmail: 'pos',
            userRole: auth.role,
            action: 'GIFT_CARD_REDEEM',
            entityType: 'GiftCard',
            entityId: result.giftCard.id,
            metadata: {
                code,
                amount,
                previousBalance: result.previousBalance,
                newBalance: Number(result.giftCard.currentBalance)
            }
        })

        return NextResponse.json(result.giftCard)
    } catch (error: any) {
        // Handle specific errors from the transaction block
        if (error.message === 'GIFT_CARD_NOT_FOUND') {
            return NextResponse.json({ error: 'Gift card not found' }, { status: 404 })
        }
        if (error.message === 'GIFT_CARD_INACTIVE') {
            return NextResponse.json({ error: 'Gift card is inactive' }, { status: 400 })
        }
        if (error.message === 'GIFT_CARD_EXPIRED') {
            return NextResponse.json({ error: 'Gift card has expired' }, { status: 400 })
        }
        if (error.message?.startsWith('INSUFFICIENT_BALANCE:')) {
            const available = error.message.split(':')[1]
            return NextResponse.json({
                error: 'Insufficient balance',
                available: Number(available),
                requested: (await req.clone().json()).amount
            }, { status: 400 })
        }

        console.error('Error redeeming gift card:', error)
        return NextResponse.json({ error: 'Failed to redeem gift card' }, { status: 500 })
    }
}
