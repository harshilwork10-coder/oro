import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/pos/transactions/suspended — Suspend cart (save for later recall)
 * GET /api/pos/transactions/suspended — List active suspended transactions
 * PUT /api/pos/transactions/suspended — Recall a suspended transaction
 * DELETE /api/pos/transactions/suspended — Void a suspended transaction
 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
        const body = await request.json()
        const { cartData, label } = body

        if (!cartData?.items?.length) {
            return NextResponse.json({ error: 'Cart must have at least one item' }, { status: 400 })
        }

        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        const suspended = await prisma.suspendedTransaction.create({
            data: {
                locationId,
                employeeId: user.id,
                cartData,
                label: label?.trim() || null,
                expiresAt,
                status: 'ACTIVE'
            },
            include: { employee: { select: { name: true } } }
        })

        return NextResponse.json({ suspended }, { status: 201 })
    } catch (error: any) {
        console.error('[SUSPEND_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to suspend' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
        // Auto-expire old ones
        await prisma.suspendedTransaction.updateMany({
            where: { locationId, status: 'ACTIVE', expiresAt: { lt: new Date() } },
            data: { status: 'EXPIRED' }
        })

        const suspended = await prisma.suspendedTransaction.findMany({
            where: { locationId, status: 'ACTIVE' },
            include: { employee: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ suspended })
    } catch (error: any) {
        console.error('[SUSPEND_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
        const body = await request.json()
        const { id } = body

        if (!id) return NextResponse.json({ error: 'Suspended transaction ID required' }, { status: 400 })

        const existing = await prisma.suspendedTransaction.findFirst({
            where: { id, locationId, status: 'ACTIVE' }
        })
        if (!existing) return NextResponse.json({ error: 'Not found or already recalled' }, { status: 404 })

        const recalled = await prisma.suspendedTransaction.update({
            where: { id },
            data: { status: 'RECALLED' }
        })

        return NextResponse.json({ recalled, cartData: existing.cartData })
    } catch (error: any) {
        console.error('[SUSPEND_PUT]', error)
        return NextResponse.json({ error: 'Failed to recall' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    try {
        const existing = await prisma.suspendedTransaction.findFirst({ where: { id, locationId } })
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        await prisma.suspendedTransaction.update({
            where: { id },
            data: { status: 'VOIDED' }
        })

        return NextResponse.json({ deleted: true })
    } catch (error: any) {
        console.error('[SUSPEND_DELETE]', error)
        return NextResponse.json({ error: 'Failed to void' }, { status: 500 })
    }
}
