import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Quick receive stock (add quantity to product)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { productId, barcode, quantity } = body
        const user = session.user as { id: string; franchiseId?: string }

        if (!quantity || quantity < 1) {
            return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
        }

        // Find product by ID or barcode, scoped to user's franchise
        let product
        if (productId) {
            product = await prisma.product.findFirst({
                where: { id: productId, ...(user.franchiseId ? { franchiseId: user.franchiseId } : {}) }
            })
        } else if (barcode) {
            product = await prisma.product.findFirst({
                where: { barcode, ...(user.franchiseId ? { franchiseId: user.franchiseId } : {}) }
            })
        }

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Update stock
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: { stock: { increment: quantity } }
        })

        return NextResponse.json({
            success: true,
            productId: product.id,
            name: product.name,
            previousStock: product.stock,
            addedQuantity: quantity,
            newStock: updated.stock
        })

    } catch (error) {
        console.error('Error receiving stock:', error)
        return NextResponse.json({ error: 'Failed to receive stock' }, { status: 500 })
    }
}

