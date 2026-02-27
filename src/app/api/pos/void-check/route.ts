'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Pre-check if cashier can void/refund (against daily limits)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { amount, type } = body // type: "VOID" or "REFUND"

        if (!amount || !type) return ApiResponse.badRequest('amount and type required')

        // Get franchise settings
        const settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId }
        })

        if (!settings) return ApiResponse.success({ allowed: true, reason: 'No limits set' })

        const limit = type === 'VOID'
            ? settings.voidLimitPerDay ? Number(settings.voidLimitPerDay) : null
            : settings.refundLimitPerDay ? Number(settings.refundLimitPerDay) : null

        const requirePin = settings.requireManagerPinAbove
            ? Number(settings.requireManagerPinAbove)
            : null

        // If no limits set, allow
        if (!limit && !requirePin) {
            return ApiResponse.success({ allowed: true, reason: 'No limits configured' })
        }

        // Check today's totals for this user
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayTransactions = await prisma.transaction.findMany({
            where: {
                employeeId: user.id,
                status: type === 'VOID' ? 'VOIDED' : 'REFUNDED',
                createdAt: { gte: today }
            },
            select: { total: true }
        })

        const todayTotal = todayTransactions.reduce((s, t) => s + Number(t.total || 0), 0)

        // Check if this void/refund would exceed daily limit
        const newTotal = todayTotal + Number(amount)
        const exceedsLimit = limit !== null && newTotal > limit

        // Check if amount requires manager PIN
        const needsPin = requirePin !== null && Number(amount) > requirePin

        return ApiResponse.success({
            allowed: !exceedsLimit,
            needsManagerPin: needsPin,
            todayTotal: Math.round(todayTotal * 100) / 100,
            dailyLimit: limit,
            remaining: limit !== null ? Math.max(0, limit - todayTotal) : null,
            reason: exceedsLimit
                ? `Daily ${type.toLowerCase()} limit exceeded ($${limit?.toFixed(2)}). Already used: $${todayTotal.toFixed(2)}`
                : needsPin
                    ? `Amount exceeds $${requirePin?.toFixed(2)} — manager PIN required`
                    : 'Allowed'
        })
    } catch (error) {
        console.error('[VOID_CHECK_POST]', error)
        return ApiResponse.error('Failed to check void limits')
    }
}
