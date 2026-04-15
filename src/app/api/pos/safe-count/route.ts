import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'

/**
 * POST /api/pos/safe-count — Record safe count, drawer count, safe drop, or bank deposit
 * Body: { action: 'SAFE_COUNT' | 'DRAWER_COUNT' | 'SAFE_DROP' | 'BANK_DEPOSIT', amount, denominations?, notes? }
 *
 * GET /api/pos/safe-count — Cash accountability history (last N days)
 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) {
        const loc = await prisma.location.findFirst({ where: { franchiseId: user.franchiseId } })
        if (!loc) return NextResponse.json({ error: 'No location' }, { status: 400 })
    }
    const finalLocationId = locationId || ''
    if (!finalLocationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
        const body = await request.json()
        const { action, amount, denominations, notes } = body

        if (!action || amount == null) {
            return NextResponse.json({ error: 'action and amount required' }, { status: 400 })
        }

        if (action === 'SAFE_COUNT' || action === 'DRAWER_COUNT') {
            const count = await prisma.cashCount.create({
                data: {
                    locationId: finalLocationId,
                    countedBy: user.id,
                    amount,
                    denominations: denominations ? JSON.stringify(denominations) : null,
                    type: action === 'SAFE_COUNT' ? 'SAFE' : 'DRAWER',
                    notes
                }
            })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: action, entityType: 'CashCount', entityId: count.id,
                details: { amount, type: action === 'SAFE_COUNT' ? 'SAFE' : 'DRAWER' }
            })

            return NextResponse.json({ success: true, count })
        }

        if (action === 'SAFE_DROP') {
            const drop = await prisma.safeDrop.create({
                data: {
                    locationId: finalLocationId,
                    droppedBy: user.id,
                    amount,
                    notes
                }
            })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'SAFE_DROP', entityType: 'SafeDrop', entityId: drop.id,
                details: { amount }
            })

            return NextResponse.json({ success: true, drop })
        }

        if (action === 'BANK_DEPOSIT') {
            const deposit = await prisma.depositLog.create({
                data: {
                    locationId: finalLocationId,
                    depositedBy: user.id,
                    amount,
                    notes,
                    depositDate: new Date()
                }
            })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'BANK_DEPOSIT', entityType: 'DepositLog', entityId: deposit.id,
                details: { amount }
            })

            return NextResponse.json({ success: true, deposit })
        }

        return NextResponse.json({ error: 'action must be: SAFE_COUNT, DRAWER_COUNT, SAFE_DROP, or BANK_DEPOSIT' }, { status: 400 })
    } catch (error: any) {
        console.error('[SAFE_COUNT_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to record count' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const since = new Date()
    since.setDate(since.getDate() - days)

    try {
        const [counts, drops, deposits] = await Promise.all([
            prisma.cashCount.findMany({
                where: { locationId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.safeDrop.findMany({
                where: { locationId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.depositLog.findMany({
                where: { locationId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' }
            })
        ])

        return NextResponse.json({
            counts, drops, deposits,
            summary: {
                lastSafeCount: counts.find((c: any) => c.type === 'SAFE')?.amount || null,
                lastDrawerCount: counts.find((c: any) => c.type === 'DRAWER')?.amount || null,
                totalDrops: drops.reduce((s, d) => s + Number(d.amount || 0), 0),
                totalDeposits: deposits.reduce((s, d) => s + Number(d.amount || 0), 0)
            }
        })
    } catch (error: any) {
        console.error('[SAFE_COUNT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch cash accountability' }, { status: 500 })
    }
}
