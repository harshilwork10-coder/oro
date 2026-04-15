import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * GET /api/pos/blind-close — Get blind close prompt (hides expected cash)
 * POST /api/pos/blind-close — Submit counted amount, reveals variance
 */
export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
        const shift = await prisma.cashDrawerSession.findFirst({
            where: { locationId, employeeId: user.id, status: 'OPEN' },
            include: { employee: { select: { name: true } } }
        })

        if (!shift) return NextResponse.json({ error: 'No open shift' }, { status: 404 })

        return NextResponse.json({
            shiftId: shift.id,
            employee: shift.employee?.name,
            openedAt: shift.startTime,
            startingCash: Number(shift.startingCash),
            message: 'Count your drawer and enter the total amount'
        })
    } catch (error: any) {
        console.error('[BLIND_CLOSE_GET]', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
        const body = await request.json()
        const { shiftId, countedAmount, denominations } = body

        if (!shiftId || countedAmount == null) {
            return NextResponse.json({ error: 'shiftId and countedAmount required' }, { status: 400 })
        }

        const shift = await prisma.cashDrawerSession.findFirst({
            where: { id: shiftId, locationId, status: 'OPEN' }
        })
        if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })

        // Calculate expected cash from transactions
        const cashTx = await prisma.transaction.findMany({
            where: { cashDrawerSessionId: shiftId, status: 'COMPLETED', paymentMethod: 'CASH' },
            select: { total: true }
        })
        const cashSales = cashTx.reduce((s, t) => s + Number(t.total || 0), 0)

        // Get cash drops for this shift
        const drops = await prisma.cashDrop.findMany({
            where: { sessionId: shiftId },
            select: { amount: true }
        })
        const totalDrops = drops.reduce((s, d) => s + Number(d.amount || 0), 0)

        const startingCash = Number(shift.startingCash || 0)
        const expectedCash = startingCash + cashSales - totalDrops
        const variance = countedAmount - expectedCash

        // Close the shift
        await prisma.cashDrawerSession.update({
            where: { id: shiftId },
            data: {
                endingCash: countedAmount,
                expectedCash,
                variance,
                endTime: new Date(),
                status: 'CLOSED',
                notes: denominations ? `Denominations: ${JSON.stringify(denominations)}` : null
            }
        })

        const isOver = variance > 0.01
        const isShort = variance < -0.01

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'BLIND_CLOSE', entityType: 'CashDrawerSession', entityId: shiftId,
            details: {
                countedAmount,
                expectedCash: Math.round(expectedCash * 100) / 100,
                variance: Math.round(variance * 100) / 100,
                status: isShort ? 'SHORT' : isOver ? 'OVER' : 'BALANCED'
            }
        })

        return NextResponse.json({
            shiftId,
            countedAmount,
            expectedCash: Math.round(expectedCash * 100) / 100,
            variance: Math.round(variance * 100) / 100,
            status: isShort ? 'SHORT' : isOver ? 'OVER' : 'BALANCED',
            cashSales: Math.round(cashSales * 100) / 100,
            totalDrops: Math.round(totalDrops * 100) / 100,
            alert: Math.abs(variance) > 5 ? `⚠️ Variance of $${Math.abs(variance).toFixed(2)} — review required` : null
        })
    } catch (error: any) {
        console.error('[BLIND_CLOSE_POST]', error)
        return NextResponse.json({ error: 'Failed to close shift' }, { status: 500 })
    }
}
