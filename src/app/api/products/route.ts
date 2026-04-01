import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { saveToOroDatabase } from '@/lib/ai/sku-lookup'
import { z } from 'zod'
import { validateBody, badRequestResponse } from '@/lib/validation'
import { checkBrandLocks } from '@/lib/brandLock'

const productCreateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.union([z.number(), z.string()]).transform(v => Number(v)),
    stock: z.union([z.number(), z.string()]).optional().default(0).transform(v => Number(v)),
    description: z.string().optional(),
    category: z.string().optional().default('RETAIL'),
    size: z.string().optional(),
})

// GET — reads are never locked
export async function GET(request: NextRequest) {
    const authUser = await getAuthUser(request)
    if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        let franchiseId = authUser.franchiseId

        // FRANCHISOR users can read their first franchise's products
        if (authUser.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: authUser.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) franchiseId = franchisor.franchises[0].id
        }

        if (!franchiseId) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

        const items = await prisma.product.findMany({
            where: { franchiseId },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(items)
    } catch (error) {
        console.error('Error fetching products:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST — blocked by lockProducts and also lockPricing (setting price on a new product)
export async function POST(request: NextRequest) {
    const authUser = await getAuthUser(request)
    if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── BRAND LOCK: lockProducts + lockPricing ────────────────────
    const lockError = await checkBrandLocks(authUser.franchiseId, ['lockProducts', 'lockPricing'])
    if (lockError) return lockError
    // ─────────────────────────────────────────────────────────────

    const validation = await validateBody(request, productCreateSchema)
    if ('error' in validation) return validation.error

    const { name, sku, barcode, price, stock, description, category, size } = validation.data

    try {
        let franchiseId = authUser.franchiseId
        if (authUser.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: authUser.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) franchiseId = franchisor.franchises[0].id
        }
        if (!franchiseId) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

        const item = await prisma.product.create({
            data: { name, sku, barcode, price, stock: stock || 0, description, category: category || 'RETAIL', franchiseId }
        })

        if (barcode && barcode.length >= 8) {
            saveToOroDatabase({ barcode, name, category, size, description, price, userId: authUser.id, franchiseId })
                .catch(err => console.error('[PRODUCTS] Failed to save to shared DB:', err))
        }

        return NextResponse.json(item)
    } catch (error) {
        console.error('Error creating product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT — blocked by lockProducts (edit) and lockPricing (price field changes)
export async function PUT(request: NextRequest) {
    const authUser = await getAuthUser(request)
    if (!authUser?.franchiseId) return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })

    try {
        const body = await request.json()
        const { id, name, sku, price, stock, description } = body
        if (!id || !name) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

        // ── BRAND LOCK: lockProducts blocks all edits ─────────────
        const productLockError = await checkBrandLocks(authUser.franchiseId, ['lockProducts'])
        if (productLockError) return productLockError

        // ── BRAND LOCK: lockPricing blocks price field specifically ─
        if (price !== undefined) {
            const priceLockError = await checkBrandLocks(authUser.franchiseId, ['lockPricing'])
            if (priceLockError) return priceLockError
        }
        // ─────────────────────────────────────────────────────────

        const item = await prisma.product.updateMany({
            where: { id, franchiseId: authUser.franchiseId },
            data: { name, sku, price: parseFloat(price), stock: parseInt(stock) || 0, description }
        })

        if (item.count === 0) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE — blocked by lockProducts
export async function DELETE(request: NextRequest) {
    const authUser = await getAuthUser(request)
    if (!authUser?.franchiseId) return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })

    // ── BRAND LOCK: lockProducts ──────────────────────────────────
    const lockError = await checkBrandLocks(authUser.franchiseId, ['lockProducts'])
    if (lockError) return lockError
    // ─────────────────────────────────────────────────────────────

    try {
        const body = await request.json()
        const { id } = body
        if (!id) return NextResponse.json({ error: 'Missing product ID' }, { status: 400 })

        const item = await prisma.product.deleteMany({ where: { id, franchiseId: authUser.franchiseId } })
        if (item.count === 0) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
