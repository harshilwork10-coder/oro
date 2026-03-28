import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/owner/low-stock - Products below reorder point
// Supports: ?locationId=xxx&limit=N
export async function GET(req: Request) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')
        const limit = parseInt(searchParams.get('limit') || '10')

        // Resolve franchiseId scope
        let franchiseId = user.franchiseId
        if (locationId) {
            const location = await prisma.location.findFirst({
                where: { id: locationId },
                select: { franchiseId: true }
            })
            if (location?.franchiseId) {
                franchiseId = location.franchiseId
            }
        }

        // Find products where stock <= reorderPoint
        const lowStock = await prisma.product.findMany({
            where: {
                franchiseId,
                isActive: true,
                reorderPoint: { not: null },
                stock: { lte: prisma.product.fields?.reorderPoint as any }
            },
            select: {
                id: true,
                name: true,
                barcode: true,
                stock: true,
                reorderPoint: true,
                price: true
            },
            orderBy: { stock: 'asc' },
            take: limit
        })

        // Prisma can't compare two columns directly, so filter in JS
        // Fetch all products with reorderPoint set and filter
        const allWithReorder = await prisma.product.findMany({
            where: {
                franchiseId,
                isActive: true,
                reorderPoint: { not: null, gt: 0 }
            },
            select: {
                id: true,
                name: true,
                barcode: true,
                stock: true,
                reorderPoint: true,
                price: true
            },
            orderBy: { stock: 'asc' }
        })

        const alerts = allWithReorder
            .filter(p => p.stock <= (p.reorderPoint || 0))
            .slice(0, limit)
            .map(p => ({
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                stock: p.stock,
                reorderPoint: p.reorderPoint,
                price: p.price ? Number(p.price) : null,
                deficit: (p.reorderPoint || 0) - p.stock,
                outOfStock: p.stock <= 0
            }))

        return NextResponse.json({
            alerts,
            totalLowStock: alerts.length,
            totalOutOfStock: alerts.filter(a => a.outOfStock).length
        })
    } catch (error) {
        console.error('[LOW_STOCK]', error)
        return NextResponse.json({ error: 'Failed to fetch low stock' }, { status: 500 })
    }
}
