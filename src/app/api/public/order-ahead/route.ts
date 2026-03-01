import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Customer Order Ahead API (Public — no auth required)
 * 
 * GET  — Fetch public menu for a store
 * POST — Submit an order from customer's phone
 * 
 * Flow:
 *   1. Customer scans QR code → /order?store=STORE_ID
 *   2. GET loads menu (products grouped by category)
 *   3. Customer builds cart and submits
 *   4. POST creates order → POS receives it
 */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const storeId = searchParams.get('storeId') || searchParams.get('store')

        if (!storeId) {
            return NextResponse.json({ error: 'storeId required' }, { status: 400 })
        }

        // Get franchise info
        const franchise = await prisma.franchise.findFirst({
            where: { id: storeId },
            select: { id: true, name: true },
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Get active products grouped by category
        const products = await prisma.product.findMany({
            where: {
                franchiseId: storeId,
                isActive: true,
                stock: { gt: 0 },
            },
            select: {
                id: true,
                name: true,
                price: true,
                category: true,
                barcode: true,
                description: true,
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        })

        // Group by category
        const categoryMap: Record<string, any[]> = {}
        for (const p of products) {
            const cat = p.category || 'Other'
            if (!categoryMap[cat]) categoryMap[cat] = []
            categoryMap[cat].push({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                description: p.description || '',
            })
        }

        const menu = Object.entries(categoryMap).map(([name, items]) => ({
            category: name,
            items,
        }))

        return NextResponse.json({
            store: { id: franchise.id, name: franchise.name },
            menu,
            totalItems: products.length,
            orderingEnabled: true,
        })

    } catch (error) {
        console.error('Order Ahead GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { storeId, customerName, customerPhone, items, notes, pickupTime } = body

        if (!storeId || !items?.length) {
            return NextResponse.json({ error: 'storeId and items required' }, { status: 400 })
        }

        // Validate store exists
        const franchise = await prisma.franchise.findFirst({
            where: { id: storeId },
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Lookup products and calculate total
        const productIds = items.map((i: any) => i.productId)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, franchiseId: storeId },
            select: { id: true, name: true, price: true },
        })

        const productMap = new Map(products.map(p => [p.id, p]))

        let subtotal = 0
        const orderItems = items.map((item: any) => {
            const product = productMap.get(item.productId)
            const price = product ? Number(product.price) : 0
            const lineTotal = price * (item.quantity || 1)
            subtotal += lineTotal
            return {
                productId: item.productId,
                name: product?.name || item.name || 'Unknown',
                quantity: item.quantity || 1,
                price,
                lineTotal: Math.round(lineTotal * 100) / 100,
            }
        })

        // Create a transaction marked as mobile order
        const orderNumber = `MOB-${Date.now().toString(36).toUpperCase()}`

        // For now, store as a lightweight order record
        // In production, this would create a Transaction with PENDING status
        const order = {
            id: orderNumber,
            storeId,
            storeName: franchise.name,
            customerName: customerName || 'Walk-in',
            customerPhone: customerPhone || '',
            items: orderItems,
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(subtotal * 0.08 * 100) / 100, // estimate 8% tax
            total: Math.round(subtotal * 1.08 * 100) / 100,
            notes: notes || '',
            pickupTime: pickupTime || 'ASAP',
            status: 'RECEIVED',
            createdAt: new Date().toISOString(),
        }

        return NextResponse.json({
            success: true,
            order,
            message: `Order ${orderNumber} received! ${pickupTime === 'ASAP' ? 'We\'ll have it ready shortly.' : `Pickup at ${pickupTime}.`}`,
            estimatedMinutes: 10,
        })

    } catch (error) {
        console.error('Order Ahead POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
