import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const payoutSchema = z.object({
    barberId: z.string(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['CASH', 'CHECK', 'BANK_TRANSFER', 'VENMO', 'ZELLE', 'OTHER']),
    note: z.string().optional(),
    commissionAmount: z.number().optional(),
    tipsAmount: z.number().optional()
})

// POST /api/owner/payouts - Record a payout to a barber
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owners/franchisors can record payouts
    const user = session.user as any
    if (!['FRANCHISOR', 'OWNER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Only owners can record payouts' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const data = payoutSchema.parse(body)
        const franchiseId = session.user.franchiseId

        // Verify the barber belongs to this franchise
        const barber = await prisma.user.findUnique({
            where: { id: data.barberId },
            select: { franchiseId: true, name: true }
        })

        if (!barber || barber.franchiseId !== franchiseId) {
            return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
        }

        // Create payout record using CashPayout model
        // CashPayout schema: franchiseId, userId, amount, type, ticketNumber?, vendorName?, invoiceNumber?
        const payout = await prisma.cashPayout.create({
            data: {
                franchiseId,
                userId: data.barberId, // userId is the barber
                amount: data.amount.toString(),
                type: 'COMMISSION', // Use for barber commission payouts
                vendorName: barber.name || 'Staff', // Re-use vendorName to store barber name
                invoiceNumber: `PAYOUT-${Date.now()}` // Unique payout reference
            }
        })

        return NextResponse.json({
            success: true,
            payout: {
                id: payout.id,
                barberId: data.barberId,
                barberName: barber.name,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                createdAt: payout.createdAt
            }
        })

    } catch (error) {
        console.error('[OWNER_PAYOUT_POST] Error:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid payout data' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 })
    }
}

// GET /api/owner/payouts - Get payout history
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const barberId = searchParams.get('barberId')
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        const where: any = {
            franchiseId: session.user.franchiseId,
            type: 'COMMISSION'
        }

        if (barberId) {
            where.userId = barberId
        }

        if (dateFrom || dateTo) {
            where.createdAt = {}
            if (dateFrom) where.createdAt.gte = new Date(dateFrom)
            if (dateTo) where.createdAt.lte = new Date(dateTo)
        }

        const payouts = await prisma.cashPayout.findMany({
            where,
            include: {
                user: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        return NextResponse.json({
            payouts: payouts.map(p => ({
                id: p.id,
                barberId: p.userId,
                barberName: p.user?.name || p.vendorName,
                amount: Number(p.amount),
                createdAt: p.createdAt
            }))
        })

    } catch (error) {
        console.error('[OWNER_PAYOUT_GET] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }
}
