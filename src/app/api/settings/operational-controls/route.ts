import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/settings/operational-controls — Read franchise-level operational config
 * PUT /api/settings/operational-controls — Update (Owner+ only)
 * 
 * Fields stored on BusinessConfig model:
 * - requireManagerPinAbove: Decimal | null
 * - refundLimitPerDay: Decimal | null
 * - allowNegativeStock: boolean (default: false)
 * - autoLockMinutes: number (default: 3)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: { franchisor: { select: { config: true } } }
        })
        const config = franchise?.franchisor?.config

        return NextResponse.json({
            requireManagerPinAbove: config?.requireManagerPinAbove ? Number(config.requireManagerPinAbove) : null,
            refundLimitPerDay: config?.refundLimitPerDay ? Number(config.refundLimitPerDay) : null,
            allowNegativeStock: config?.allowNegativeStock ?? false,
            autoLockMinutes: config?.autoLockMinutes ?? 3
        })
    } catch (error: any) {
        console.error('[OPERATIONAL_CONTROLS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Owner or Franchisor only
    if (!['OWNER', 'FRANCHISOR'].includes(user.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { requireManagerPinAbove, refundLimitPerDay, allowNegativeStock, autoLockMinutes } = body

        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: { franchisorId: true }
        })
        if (!franchise) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

        const updated = await prisma.businessConfig.upsert({
            where: { franchisorId: franchise.franchisorId },
            create: {
                franchisorId: franchise.franchisorId,
                requireManagerPinAbove: requireManagerPinAbove ?? null,
                refundLimitPerDay: refundLimitPerDay ?? null,
                allowNegativeStock: allowNegativeStock ?? false,
                autoLockMinutes: autoLockMinutes ?? 3
            },
            update: {
                requireManagerPinAbove: requireManagerPinAbove ?? null,
                refundLimitPerDay: refundLimitPerDay ?? null,
                allowNegativeStock: allowNegativeStock ?? false,
                autoLockMinutes: autoLockMinutes ?? 3
            }
        })

        return NextResponse.json({
            success: true,
            config: {
                requireManagerPinAbove: updated.requireManagerPinAbove ? Number(updated.requireManagerPinAbove) : null,
                refundLimitPerDay: updated.refundLimitPerDay ? Number(updated.refundLimitPerDay) : null,
                allowNegativeStock: updated.allowNegativeStock,
                autoLockMinutes: updated.autoLockMinutes
            }
        })
    } catch (error: any) {
        console.error('[OPERATIONAL_CONTROLS_PUT]', error)
        return NextResponse.json({ error: error.message || 'Failed to update config' }, { status: 500 })
    }
}
