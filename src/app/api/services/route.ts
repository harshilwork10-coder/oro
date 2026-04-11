import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'
import { checkBrandLock } from '@/lib/brandLock'

// GET: Fetch services — no lock needed for reads
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const locationId = searchParams.get('locationId')
        const search = searchParams.get('search')
        const categoryId = searchParams.get('categoryId')

        let franchiseId: string | null = null

        if (locationId) {
            const location = await prisma.location.findUnique({
                where: { id: locationId },
                select: { franchiseId: true }
            })
            if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })
            franchiseId = location.franchiseId
        } else {
            if (!user?.franchiseId) {
                return NextResponse.json({ data: [], pagination: { nextCursor: null, hasMore: false, total: 0 } })
            }
            franchiseId = user.franchiseId
        }

        const whereClause: Record<string, unknown> = { franchiseId }
        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { description: { contains: search } }
            ]
        }
        if (categoryId) whereClause.categoryId = categoryId

        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            orderBy: orderBy || { name: 'asc' }
        }
        if (cursor) { queryArgs.cursor = { id: cursor }; queryArgs.skip = 1 }

        const services = await prisma.service.findMany(
            queryArgs as Parameters<typeof prisma.service.findMany>[0]
        )

        const hasMore = services.length > (take || 50)
        const data = hasMore ? services.slice(0, take || 50) : services
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data, pagination: { nextCursor, hasMore, total: data.length } })
    } catch (error) {
        console.error('Error fetching services:', error)
        return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }
}

// POST: Create service — blocked by lockServices
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── BRAND LOCK: lockServices ──────────────────────────────
        const lockError = await checkBrandLock(user.franchiseId, 'lockServices')
        if (lockError) return lockError
        // ─────────────────────────────────────────────────────────

        const body = await req.json()
        const service = await prisma.service.create({
            data: { ...body, franchiseId: user.franchiseId }
        })
        return NextResponse.json(service)
    } catch (error) {
        console.error('Error creating service:', error)
        return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
    }
}

// PUT: Update service — blocked by lockServices (name/category changes) and lockPricing (price changes)
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = req.nextUrl
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Service ID required' }, { status: 400 })

        const body = await req.json()

        // ── BRAND LOCK: lockServices blocks all service edits ─────
        const serviceLockError = await checkBrandLock(user.franchiseId, 'lockServices')
        if (serviceLockError) return serviceLockError

        // ── BRAND LOCK: lockPricing blocks price-only changes too ─
        if (body.price !== undefined || body.memberPrice !== undefined) {
            const priceLockError = await checkBrandLock(user.franchiseId, 'lockPricing')
            if (priceLockError) return priceLockError
        }
        // ─────────────────────────────────────────────────────────

        const service = await prisma.service.update({
            where: { id, franchiseId: user.franchiseId },
            data: body
        })
        return NextResponse.json(service)
    } catch (error) {
        console.error('Error updating service:', error)
        return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
    }
}

// DELETE: Delete service — blocked by lockServices
export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── BRAND LOCK: lockServices ──────────────────────────────
        const lockError = await checkBrandLock(user.franchiseId, 'lockServices')
        if (lockError) return lockError
        // ─────────────────────────────────────────────────────────

        const { searchParams } = req.nextUrl
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Service ID required' }, { status: 400 })

        await prisma.service.delete({ where: { id, franchiseId: user.franchiseId } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting service:', error)
        return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
    }
}
