import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { checkBrandLock } from '@/lib/brandLock'

// GET — reads are never locked
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // PricingRule is per-location. Get all rules for locations in this franchise.
        const locations = await prisma.location.findMany({
            where: { franchiseId: authUser.franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        const rules = await prisma.pricingRule.findMany({
            where: { locationId: { in: locationIds } },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ rules })
    } catch (error) {
        console.error('[PRICING_RULES]', error)
        return NextResponse.json({ rules: [] })
    }
}

// POST — blocked by lockPricing
export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── BRAND LOCK: lockPricing ───────────────────────────────
        const lockError = await checkBrandLock(authUser.franchiseId, 'lockPricing')
        if (lockError) return lockError
        // ─────────────────────────────────────────────────────────

        const body = await req.json()
        const rule = await prisma.pricingRule.create({
            data: body
        })
        return NextResponse.json({ rule })
    } catch (error) {
        console.error('[PRICING_RULES_CREATE]', error)
        return NextResponse.json({ error: 'Failed to create pricing rule' }, { status: 500 })
    }
}

// PUT — blocked by lockPricing
export async function PUT(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── BRAND LOCK: lockPricing ───────────────────────────────
        const lockError = await checkBrandLock(authUser.franchiseId, 'lockPricing')
        if (lockError) return lockError
        // ─────────────────────────────────────────────────────────

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        const body = await req.json()
        const rule = await prisma.pricingRule.update({ where: { id }, data: body })
        return NextResponse.json({ rule })
    } catch (error) {
        console.error('[PRICING_RULES_UPDATE]', error)
        return NextResponse.json({ error: 'Failed to update pricing rule' }, { status: 500 })
    }
}

// DELETE — blocked by lockPricing
export async function DELETE(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── BRAND LOCK: lockPricing ───────────────────────────────
        const lockError = await checkBrandLock(authUser.franchiseId, 'lockPricing')
        if (lockError) return lockError
        // ─────────────────────────────────────────────────────────

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        await prisma.pricingRule.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[PRICING_RULES_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete pricing rule' }, { status: 500 })
    }
}
