import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// POST: Quick receive stock (add quantity to product) with audit trail
export async function POST(request: Request) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { productId, barcode, quantity, notes, supplierId } = body
        if (!quantity || quantity < 1) {
            return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
        }

        // Find product by ID or barcode, scoped to user's franchise
        let product
        if (productId) {
            product = await prisma.product.findFirst({
                where: { id: productId, franchiseId: user.franchiseId }
            })
        } else if (barcode) {
            product = await prisma.product.findFirst({
                where: { barcode, franchiseId: user.franchiseId }
            })
        }

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const previousStock = product.stock

        // Update stock
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: { stock: { increment: quantity } }
        })

        // Create StockAdjustment record for audit trail
        await (prisma as any).stockAdjustment.create({
            data: {
                productId: product.id,
                quantity: quantity,
                reason: 'RECEIVED',
                notes: notes || `Quick receive: +${quantity} units`,
                previousStock: previousStock,
                newStock: updated.stock,
                performedBy: user.id,
                ...(user.locationId ? { locationId: user.locationId } : {})
            }
        })

        // Log activity
        try {
            await (prisma as any).activityLog.create({
                data: {
                    type: 'STOCK_RECEIVED',
                    description: `Received ${quantity} units of ${product.name}`,
                    userId: user.id,
                    franchiseId: user.franchiseId,
                    metadata: JSON.stringify({
                        productId: product.id,
                        productName: product.name,
                        quantity,
                        previousStock,
                        newStock: updated.stock,
                        supplierId: supplierId || null
                    })
                }
            })
        } catch {
            // Activity log is non-critical — don't fail the request
        }

        return NextResponse.json({
            success: true,
            productId: product.id,
            name: product.name,
            previousStock: previousStock,
            addedQuantity: quantity,
            newStock: updated.stock
        })

    } catch (error) {
        console.error('Error receiving stock:', error)
        return NextResponse.json({ error: 'Failed to receive stock' }, { status: 500 })
    }
}
