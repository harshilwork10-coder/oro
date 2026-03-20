import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Record a lottery ticket sale for inventory tracking
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { barcode, quantity, price } = await request.json()

        if (!price || price <= 0) {
            return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
        }

        // Record the sale as a SALE type lottery transaction
        const sale = await prisma.lotteryTransaction.create({
            data: {
                franchiseId: user.franchiseId,
                locationId: user.locationId || '',
                type: 'SALE',
                amount: price * (quantity || 1),
                ticketNumber: barcode || null,
                employeeId: user.id
            }
        })

        return NextResponse.json({ success: true, saleId: sale.id })
    } catch (error) {
        console.error('[LOTTERY_SELL]', error)
        return NextResponse.json({ error: 'Failed to record lottery sale' }, { status: 500 })
    }
}
