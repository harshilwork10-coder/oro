import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'

// GET /api/inventory/suppliers - List all suppliers with pagination
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const search = searchParams.get('search')

        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { contactName: { contains: search } }
            ]
        }

        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                _count: { select: { purchaseOrders: true, products: true } }
            },
            orderBy: orderBy || { name: 'asc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const suppliers = await prisma.supplier.findMany(
            queryArgs as Parameters<typeof prisma.supplier.findMany>[0]
        )

        const hasMore = suppliers.length > (take || 50)
        const data = hasMore ? suppliers.slice(0, take || 50) : suppliers
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('Failed to fetch suppliers:', error)
        return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
    }
}

// POST /api/inventory/suppliers - Create new supplier
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { name, email, phone, contactName, address } = body

        if (!name) {
            return NextResponse.json({ error: 'Supplier name is required' }, { status: 422 })
        }

        const supplier = await prisma.supplier.create({
            data: {
                franchiseId: user.franchiseId,
                name,
                email: email || null,
                phone: phone || null,
                contactName: contactName || null,
                address: address || null
            }
        })

        return NextResponse.json(supplier, { status: 201 })
    } catch (error) {
        console.error('Failed to create supplier:', error)
        return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
    }
}
