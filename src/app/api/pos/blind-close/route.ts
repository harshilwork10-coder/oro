'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Cashier blind close (expected amount NOT shown to cashier)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        // Get current open shift
        const shift = await prisma.cashDrawerSession.findFirst({
            where: { locationId, employeeId: user.id, status: 'OPEN' },
            include: { employee: { select: { name: true } } }
        })

        if (!shift) return ApiResponse.notFound('No open shift')

        // Return just the shift ID + open time (NOT the expected cash — that's the "blind" part)
        return ApiResponse.success({
            shiftId: shift.id,
            employee: shift.employee?.name,
            openedAt: shift.startTime,
            startingCash: Number(shift.startingCash),
            // Expected cash is intentionally NOT returned
            // Cashier counts first, then system reveals the expected amount
            message: 'Count your drawer and enter the total amount'
        })
    } catch (error) {
        console.error('[BLIND_CLOSE_GET]', error)
        return ApiResponse.error('Failed')
    }
}

// POST — Submit blind count (then reveal expected and variance)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { shiftId, countedAmount, denominations } = body

        if (!shiftId || countedAmount == null) {
            return ApiResponse.badRequest('shiftId and countedAmount required')
        }

        const shift = await prisma.cashDrawerSession.findFirst({
            where: { id: shiftId, locationId, status: 'OPEN' }
        })
        if (!shift) return ApiResponse.notFound('Shift not found')

        // NOW calculate expected cash
        const cashTx = await prisma.transaction.findMany({
            where: { cashDrawerSessionId: shiftId, status: 'COMPLETED', paymentMethod: 'CASH' },
            select: { total: true }
        })
        const cashSales = cashTx.reduce((s, t) => s + Number(t.total || 0), 0)

        const drops = await (prisma as any).cashDrop.findMany({
            where: { sessionId: shiftId },
            select: { amount: true }
        })
        const totalDrops = drops.reduce((s: number, d: any) => s + Number(d.amount || 0), 0)

        const startingCash = Number(shift.startingCash || 0)
        const expectedCash = startingCash + cashSales - totalDrops
        const variance = countedAmount - expectedCash

        // Close the shift with the blind count data
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

        return ApiResponse.success({
            shiftId,
            countedAmount,
            expectedCash: Math.round(expectedCash * 100) / 100,
            variance: Math.round(variance * 100) / 100,
            status: isShort ? 'SHORT' : isOver ? 'OVER' : 'BALANCED',
            cashSales: Math.round(cashSales * 100) / 100,
            totalDrops: Math.round(totalDrops * 100) / 100,
            alert: Math.abs(variance) > 5 ? `⚠️ Variance of $${Math.abs(variance).toFixed(2)} — review required` : null
        })
    } catch (error) {
        console.error('[BLIND_CLOSE_POST]', error)
        return ApiResponse.error('Failed to close shift')
    }
}
