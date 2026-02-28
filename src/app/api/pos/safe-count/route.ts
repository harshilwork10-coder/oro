'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Record safe count or bank deposit
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { action, amount, denominations, notes } = body

        if (action === 'SAFE_COUNT') {
            const count = await (prisma as any).cashCount.create({
                data: {
                    locationId,
                    countedBy: user.id,
                    amount,
                    denominations: denominations ? JSON.stringify(denominations) : null,
                    type: 'SAFE',
                    notes
                }
            })
            return ApiResponse.success({ count })
        }

        if (action === 'DRAWER_COUNT') {
            const count = await (prisma as any).cashCount.create({
                data: {
                    locationId,
                    countedBy: user.id,
                    amount,
                    denominations: denominations ? JSON.stringify(denominations) : null,
                    type: 'DRAWER',
                    notes
                }
            })
            return ApiResponse.success({ count })
        }

        if (action === 'SAFE_DROP') {
            const drop = await (prisma as any).safeDrop.create({
                data: {
                    locationId,
                    droppedBy: user.id,
                    amount,
                    notes
                }
            })
            return ApiResponse.success({ drop })
        }

        if (action === 'BANK_DEPOSIT') {
            const deposit = await (prisma as any).depositLog.create({
                data: {
                    locationId,
                    depositedBy: user.id,
                    amount,
                    notes,
                    depositDate: new Date()
                }
            })
            return ApiResponse.success({ deposit })
        }

        return ApiResponse.badRequest('action required: SAFE_COUNT, DRAWER_COUNT, SAFE_DROP, BANK_DEPOSIT')
    } catch (error) {
        console.error('[SAFE_COUNT_POST]', error)
        return ApiResponse.error('Failed to record count')
    }
}

// GET — Get cash accountability history
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '7')
        const since = new Date(); since.setDate(since.getDate() - days)

        const [counts, drops, deposits] = await Promise.all([
            (prisma as any).cashCount.findMany({
                where: { locationId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' }
            }),
            (prisma as any).safeDrop.findMany({
                where: { locationId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' }
            }),
            (prisma as any).depositLog.findMany({
                where: { locationId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' }
            })
        ])

        return ApiResponse.success({
            counts, drops, deposits,
            summary: {
                lastSafeCount: counts.find((c: any) => c.type === 'SAFE')?.amount || null,
                totalDrops: drops.reduce((s: number, d: any) => s + Number(d.amount || 0), 0),
                totalDeposits: deposits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0)
            }
        })
    } catch (error) {
        console.error('[SAFE_COUNT_GET]', error)
        return ApiResponse.error('Failed to fetch cash accountability')
    }
}
