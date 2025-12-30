import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ items: [] })
        }

        // Get products below minimum stock
        const products = await prisma.product.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                minStock: { gt: 0 },
                stock: { lt: prisma.product.fields.minStock }
            },
            select: {
                id: true,
                name: true,
                barcode: true,
                category: true,
                stock: true,
                minStock: true,
                maxStock: true,
                vendor: true,
                cost: true
            },
            orderBy: { stock: 'asc' }
        })

        // Calculate suggested order quantity
        const items = products.map(p => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode || '',
            category: p.category || '',
            currentStock: p.stock,
            minStock: p.minStock || 0,
            maxStock: p.maxStock || (p.minStock || 0) * 2,
            suggestedOrder: Math.max((p.maxStock || (p.minStock || 0) * 2) - p.stock, 0),
            vendor: p.vendor || '',
            cost: Number(p.cost || 0)
        }))

        return NextResponse.json({ items })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

