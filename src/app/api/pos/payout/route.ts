import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CashPayoutData {
    amount: number
    type: 'lottery' | 'scratch' | 'vendor'
    ticketNumber?: string
    vendorName?: string
    invoiceNumber?: string
    notes?: string
}

// POST - Record a cash payout (lottery, scratch, vendor)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body: CashPayoutData = await request.json()
        const { amount, type, ticketNumber, vendorName, invoiceNumber, notes } = body

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 })
        }

        if (!['lottery', 'scratch', 'vendor'].includes(type)) {
            return NextResponse.json({ error: 'Invalid payout type' }, { status: 400 })
        }

        // Check lottery limits
        if ((type === 'lottery' || type === 'scratch') && amount > 599) {
            return NextResponse.json({
                error: 'Lottery payouts over $599 must be claimed at lottery office'
            }, { status: 400 })
        }

        // Vendor payout requires vendor name
        if (type === 'vendor' && !vendorName) {
            return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 })
        }

        // Get current drawer session (if using shifts)
        let sessionId: string | null = null
        const activeSession = await prisma.cashDrawerSession.findFirst({
            where: {
                employeeId: user.id,
                status: 'OPEN'
            }
        })
        if (activeSession) {
            sessionId = activeSession.id
        }

        // Create payout record
        const payout = await prisma.cashPayout.create({
            data: {
                franchiseId: user.franchiseId,
                locationId: user.locationId || null,
                userId: user.id,
                sessionId,
                amount,
                type,
                ticketNumber: ticketNumber || null,
                vendorName: vendorName || null,
                invoiceNumber: invoiceNumber || null,
                notes: notes || null
            }
        })

        // If lottery payout, also update lottery transaction record
        // NOTE: LotteryTransaction model may have different required fields
        // TODO: Implement when model schema is confirmed
        if (type === 'lottery' || type === 'scratch') {
            // Commented out until LotteryTransaction schema is confirmed
            // await prisma.lotteryTransaction.create({
            //     data: {
            //         franchiseId: user.franchiseId,
            //         locationId: user.locationId || undefined,
            //         type: 'WINNER_PAYOUT',
            //         amount: -amount // Negative = cash out
            //     }
            // })
            // Debug log removed
        }

        return NextResponse.json({
            success: true,
            payout,
            message: `Payout of $${amount.toFixed(2)} recorded`
        })

    } catch (error) {
        console.error('Payout error:', error)
        return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 })
    }
}

// GET - List payouts for reporting
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const payouts = await prisma.cashPayout.findMany({
            where: {
                franchiseId: user.franchiseId,
                ...(type && type !== 'all' ? { type } : {}),
                ...(startDate ? { createdAt: { gte: new Date(startDate) } } : {}),
                ...(endDate ? { createdAt: { lte: new Date(endDate) } } : {})
            },
            include: {
                user: { select: { name: true } },
                location: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        // Calculate totals with explicit types
        const totals = {
            lottery: payouts.filter((p: { type: string }) => p.type === 'lottery')
                .reduce((s: number, p: { amount: any }) => s + Number(p.amount), 0),
            scratch: payouts.filter((p: { type: string }) => p.type === 'scratch')
                .reduce((s: number, p: { amount: any }) => s + Number(p.amount), 0),
            vendor: payouts.filter((p: { type: string }) => p.type === 'vendor')
                .reduce((s: number, p: { amount: any }) => s + Number(p.amount), 0),
            total: payouts.reduce((s: number, p: { amount: any }) => s + Number(p.amount), 0)
        }

        return NextResponse.json({ payouts, totals })

    } catch (error) {
        console.error('Get payouts error:', error)
        return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }
}

