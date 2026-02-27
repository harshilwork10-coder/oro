'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Generate X/Z report for current or specified shift
// X report = mid-shift snapshot (shift stays open)
// Z report = end-of-shift final (shift closes)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const shiftId = searchParams.get('shiftId')
        const reportType = searchParams.get('type') || 'X' // X or Z

        // Find the shift
        let shift: any
        if (shiftId) {
            shift = await prisma.cashDrawerSession.findFirst({
                where: { id: shiftId, locationId },
                include: { employee: { select: { name: true } } }
            })
        } else {
            // Get current open shift for this employee
            shift = await prisma.cashDrawerSession.findFirst({
                where: { locationId, employeeId: user.id, status: 'OPEN' },
                include: { employee: { select: { name: true } } }
            })
        }

        if (!shift) return ApiResponse.notFound('No shift found')

        // Get all transactions for this shift
        const transactions = await prisma.transaction.findMany({
            where: {
                cashDrawerSessionId: shift.id,
                status: 'COMPLETED'
            },
            select: {
                total: true,
                subtotal: true,
                taxAmount: true,
                paymentMethod: true,
                createdAt: true
            }
        })

        // Get cash drops for this shift
        const cashDrops = await (prisma as any).cashDrop.findMany({
            where: { sessionId: shift.id },
            select: { amount: true, reason: true, createdAt: true }
        })

        // Get drawer activities for this shift
        const activities = await (prisma as any).drawerActivity.findMany({
            where: { shiftId: shift.id },
            select: { type: true, amount: true, reason: true, timestamp: true }
        })

        // Calculate payment breakdown
        const paymentBreakdown = {
            CASH: { count: 0, total: 0 },
            CARD: { count: 0, total: 0 },
            EBT: { count: 0, total: 0 },
            OTHER: { count: 0, total: 0 }
        }

        let totalSales = 0
        let totalTax = 0
        let transactionCount = 0

        for (const tx of transactions) {
            const total = Number(tx.total || 0)
            const tax = Number(tx.taxAmount || 0)
            totalSales += total
            totalTax += tax
            transactionCount++

            const method = (tx.paymentMethod || 'OTHER').toUpperCase()
            if (method in paymentBreakdown) {
                (paymentBreakdown as any)[method].count++
                    ; (paymentBreakdown as any)[method].total += total
            } else {
                paymentBreakdown.OTHER.count++
                paymentBreakdown.OTHER.total += total
            }
        }

        // Cash calculations
        const startingCash = Number(shift.startingCash || 0)
        const totalCashDrops = cashDrops.reduce((s: number, d: any) => s + Number(d.amount || 0), 0)
        const cashPayments = paymentBreakdown.CASH.total
        const expectedCash = startingCash + cashPayments - totalCashDrops
        const endingCash = shift.endingCash ? Number(shift.endingCash) : null
        const variance = endingCash !== null ? endingCash - expectedCash : null

        // No-sale count
        const noSaleCount = activities.filter((a: any) => a.type === 'NO_SALE').length

        const report = {
            reportType, // X or Z
            shiftId: shift.id,
            employee: shift.employee?.name || 'Unknown',
            status: shift.status,
            openedAt: shift.startTime,
            closedAt: shift.endTime,

            // Sales Summary
            transactionCount,
            totalSales: Math.round(totalSales * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            netSales: Math.round((totalSales - totalTax) * 100) / 100,

            // Payment Breakdown
            paymentBreakdown: Object.fromEntries(
                Object.entries(paymentBreakdown).map(([k, v]) => [k, {
                    count: v.count,
                    total: Math.round(v.total * 100) / 100
                }])
            ),

            // Cash Accountability
            startingCash,
            cashPayments: Math.round(cashPayments * 100) / 100,
            totalCashDrops: Math.round(totalCashDrops * 100) / 100,
            cashDropDetails: cashDrops,
            expectedCash: Math.round(expectedCash * 100) / 100,
            endingCash,
            variance: variance !== null ? Math.round(variance * 100) / 100 : null,

            // Activity
            noSaleCount,
            drawerActivities: activities
        }

        return ApiResponse.success({ report })
    } catch (error) {
        console.error('[XZ_REPORT_GET]', error)
        return ApiResponse.error('Failed to generate report')
    }
}
