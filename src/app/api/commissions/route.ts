import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { checkBrandLock } from '@/lib/brandLock'

// GET — reads are never locked
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const franchiseId = searchParams.get('franchiseId')
        const targetFranchiseId = franchiseId || user.franchiseId
        if (targetFranchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const rules = await prisma.commissionRule.findMany({
            where: { franchiseId: targetFranchiseId },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(rules)
    } catch (error) {
        console.error('Error fetching commission rules:', error)
        return NextResponse.json({ error: 'Failed to fetch commission rules' }, { status: 500 })
    }
}

// POST — blocked by lockCommission
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── BRAND LOCK: lockCommission ────────────────────────────
        const lockError = await checkBrandLock(user.franchiseId, 'lockCommission')
        if (lockError) return lockError
        // ─────────────────────────────────────────────────────────

        const body = await req.json()
        const { franchiseId, name, servicePercent, productPercent } = body

        const targetFranchiseId = franchiseId || user.franchiseId
        if (targetFranchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const rule = await prisma.commissionRule.create({
            data: {
                franchiseId: targetFranchiseId,
                name,
                servicePercent: new Decimal(parseFloat(servicePercent) || 0),
                productPercent: new Decimal(parseFloat(productPercent) || 0)
            }
        })
        return NextResponse.json(rule)
    } catch (error) {
        console.error('Error creating commission rule:', error)
        return NextResponse.json({ error: 'Failed to create commission rule' }, { status: 500 })
    }
}

// PUT — blocked by lockCommission
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── BRAND LOCK: lockCommission ────────────────────────────
        const lockError = await checkBrandLock(user.franchiseId, 'lockCommission')
        if (lockError) return lockError
        // ─────────────────────────────────────────────────────────

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        const body = await req.json()
        const rule = await prisma.commissionRule.update({
            where: { id, franchiseId: user.franchiseId },
            data: body
        })
        return NextResponse.json(rule)
    } catch (error) {
        console.error('Error updating commission rule:', error)
        return NextResponse.json({ error: 'Failed to update commission rule' }, { status: 500 })
    }
}

// DELETE — blocked by lockCommission
export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── BRAND LOCK: lockCommission ────────────────────────────
        const lockError = await checkBrandLock(user.franchiseId, 'lockCommission')
        if (lockError) return lockError
        // ─────────────────────────────────────────────────────────

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        await prisma.commissionRule.delete({ where: { id, franchiseId: user.franchiseId } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting commission rule:', error)
        return NextResponse.json({ error: 'Failed to delete commission rule' }, { status: 500 })
    }
}
