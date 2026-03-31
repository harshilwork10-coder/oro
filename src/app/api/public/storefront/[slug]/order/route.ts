import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/public/storefront/[slug]/order — Place pickup/reserve order
export async function POST(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const location = await prisma.location.findFirst({
            where: { slug: params.slug },
            include: {
                storefrontProfile: true,
                franchise: {
                    include: {
                        franchisor: {
                            include: { config: { select: { usesStorefront: true } } }
                        }
                    }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        const featureEnabled = location.franchise?.franchisor?.config?.usesStorefront
        if (!featureEnabled || !location.storefrontProfile?.isEnabled) {
            return NextResponse.json({ error: 'Store not available' }, { status: 404 })
        }

        if (!location.storefrontProfile.pickupEnabled) {
            return NextResponse.json({ error: 'Ordering is currently disabled' }, { status: 400 })
        }

        const profile = location.storefrontProfile
        const body = await req.json()
        const { customerName, customerPhone, items, notes } = body

        // Validate required fields
        if (!customerName?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }
        if (!customerPhone?.trim()) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
        }
        if (items.length > profile.maxItemsPerOrder) {
            return NextResponse.json({ error: `Maximum ${profile.maxItemsPerOrder} items per order` }, { status: 400 })
        }

        // Validate and snapshot each item from the database
        const itemIds = items.map((i: any) => i.itemId)
        const dbItems = await prisma.item.findMany({
            where: {
                id: { in: itemIds },
                franchiseId: location.franchiseId,
                isActive: true,
                ageRestricted: false, // Extra safety: no age-restricted items
            },
            select: { id: true, name: true, price: true, stock: true }
        })

        const dbItemMap = new Map(dbItems.map(i => [i.id, i]))
        const orderItems: { itemId: string; itemName: string; quantity: number; price: number; total: number }[] = []
        const warnings: string[] = []

        for (const cartItem of items) {
            const dbItem = dbItemMap.get(cartItem.itemId)
            if (!dbItem) {
                warnings.push(`Item "${cartItem.itemName || cartItem.itemId}" is no longer available`)
                continue
            }

            const qty = Math.max(1, Math.min(parseInt(cartItem.quantity) || 1, 99))
            const price = Number(dbItem.price)

            // Price drift check — warn if > 10% different from what customer saw
            if (cartItem.expectedPrice && Math.abs(price - cartItem.expectedPrice) / cartItem.expectedPrice > 0.10) {
                warnings.push(`Price of "${dbItem.name}" has changed from $${cartItem.expectedPrice.toFixed(2)} to $${price.toFixed(2)}`)
            }

            orderItems.push({
                itemId: dbItem.id,
                itemName: dbItem.name,
                quantity: qty,
                price,
                total: Number((price * qty).toFixed(2)),
            })
        }

        if (orderItems.length === 0) {
            return NextResponse.json({ error: 'None of the selected items are available', warnings }, { status: 400 })
        }

        // Calculate totals
        const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0)

        // Check min order
        if (profile.minOrderAmount && subtotal < Number(profile.minOrderAmount)) {
            return NextResponse.json({
                error: `Minimum order amount is $${Number(profile.minOrderAmount).toFixed(2)}`
            }, { status: 400 })
        }

        // Estimate tax (use location tax rate if available, else 0)
        const taxRate = 0.08 // Default estimate — actual tax calculated at POS
        const estimatedTax = Number((subtotal * taxRate).toFixed(2))
        const estimatedTotal = Number((subtotal + estimatedTax).toFixed(2))

        // Generate order number: SF-{4 digit sequential}
        const lastOrder = await prisma.storefrontOrder.findFirst({
            where: { locationId: location.id },
            orderBy: { createdAt: 'desc' },
            select: { orderNumber: true }
        })
        const lastNum = lastOrder ? parseInt(lastOrder.orderNumber.split('-')[1]) || 1000 : 1000
        const orderNumber = `SF-${lastNum + 1}`

        // Pickup time
        const pickupTime = new Date()
        pickupTime.setMinutes(pickupTime.getMinutes() + profile.pickupLeadMinutes)

        // Create order
        const order = await prisma.storefrontOrder.create({
            data: {
                orderNumber,
                locationId: location.id,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                subtotal,
                estimatedTax,
                estimatedTotal,
                notes: notes?.trim() || null,
                pickupTime,
                items: {
                    create: orderItems.map(i => ({
                        itemId: i.itemId,
                        itemName: i.itemName,
                        quantity: i.quantity,
                        price: i.price,
                        total: i.total,
                    }))
                }
            },
            include: { items: true }
        })

        return NextResponse.json({
            success: true,
            orderNumber: order.orderNumber,
            estimatedReady: pickupTime.toISOString(),
            leadMinutes: profile.pickupLeadMinutes,
            store: {
                name: location.publicName || location.name,
                address: location.address,
                phone: location.publicPhone,
            },
            warnings: warnings.length > 0 ? warnings : undefined,
        })
    } catch (error) {
        console.error('[STOREFRONT_ORDER_POST]', error)
        return NextResponse.json({ error: 'Failed to place order' }, { status: 500 })
    }
}
