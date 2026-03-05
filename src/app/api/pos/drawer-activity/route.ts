// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Log a drawer activity (NO_SALE, CASH_DROP, etc.)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { type, reason, note, amount, transactionId } = body

        if (!type) return ApiResponse.badRequest('Activity type is required')

        // Find current open shift for this employee
        const shift = await prisma.cashDrawerSession.findFirst({
            where: { locationId, employeeId: user.id, status: 'OPEN' }
        })

        // Determine alert level for NO_SALE
        let alertLevel = null
        if (type === 'NO_SALE') {
            // Count NO_SALE events this shift
            if (shift) {
                const noSaleCount = await (prisma as any).drawerActivity.count({
                    where: { shiftId: shift.id, type: 'NO_SALE' }
                })
                if (noSaleCount >= 5) alertLevel = 'CRITICAL'
                else if (noSaleCount >= 3) alertLevel = 'WARNING'
            }
        }

        const activity = await (prisma as any).drawerActivity.create({
            data: {
                type,
                reason: reason || null,
                note: note || null,
                amount: amount || null,
                employeeId: user.id,
                shiftId: shift?.id || null,
                locationId,
                transactionId: transactionId || null,
                alertLevel,
                alertSent: false
            },
            include: {
                employee: { select: { name: true } }
            }
        })

        return ApiResponse.success({ activity })
    } catch (error) {
        console.error('[DRAWER_ACTIVITY_POST]', error)
        return ApiResponse.error('Failed to log activity')
    }
}

// GET — List drawer activities for current shift or date range
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const shiftId = searchParams.get('shiftId')
        const type = searchParams.get('type') // Filter by type
        const dateStr = searchParams.get('date')

        const where: any = { locationId }

        if (shiftId) {
            where.shiftId = shiftId
        } else if (dateStr) {
            const start = new Date(dateStr + 'T00:00:00')
            const end = new Date(dateStr + 'T23:59:59')
            where.timestamp = { gte: start, lte: end }
        } else {
            // Default: today
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            where.timestamp = { gte: today }
        }

        if (type) where.type = type

        const activities = await (prisma as any).drawerActivity.findMany({
            where,
            include: {
                employee: { select: { name: true } }
            },
            orderBy: { timestamp: 'desc' },
            take: 100
        })

        // Summary counts
        const summary = {
            total: activities.length,
            noSale: activities.filter((a: any) => a.type === 'NO_SALE').length,
            cashDrop: activities.filter((a: any) => a.type === 'CASH_DROP').length,
            refund: activities.filter((a: any) => a.type === 'REFUND').length,
            warnings: activities.filter((a: any) => a.alertLevel === 'WARNING').length,
            criticals: activities.filter((a: any) => a.alertLevel === 'CRITICAL').length
        }

        return ApiResponse.success({ activities, summary })
    } catch (error) {
        console.error('[DRAWER_ACTIVITY_GET]', error)
        return ApiResponse.error('Failed to fetch activities')
    }
}
