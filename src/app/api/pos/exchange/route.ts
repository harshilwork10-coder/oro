import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * POST /api/pos/exchange — Process an exchange (return item A, give item B)
 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    try {
        const body = await request.json()
        const { originalTransactionId, returnItems, newItems, reason } = body as {
            originalTransactionId: string
            returnItems: { itemId: string; quantity: number }[]
            newItems: { itemId: string; quantity: number; price: number }[]
            reason?: string
        }

        if (!returnItems?.length || !newItems?.length) {
            return NextResponse.json({ error: 'returnItems and newItems required' }, { status: 400 })
        }

        // Calculate return value
        const origTx = await prisma.transaction.findFirst({
            where: { id: originalTransactionId, locationId },
            include: { items: true }
        })

        let returnTotal = 0
        for (const ri of returnItems) {
            const origItem = origTx?.items.find(i => i.itemId === ri.itemId)
            if (origItem) {
                returnTotal += Number(origItem.unitPrice) * ri.quantity
            }
        }

        const newTotal = newItems.reduce((s, ni) => s + (ni.price * ni.quantity), 0)
        const difference = newTotal - returnTotal

        // Create exchange transaction
        const exchange = await prisma.transaction.create({
            data: {
                locationId,
                employeeId: user.id,
                type: 'EXCHANGE',
                status: 'COMPLETED',
                subtotal: newTotal,
                total: Math.abs(difference),
                paymentMethod: difference > 0 ? 'PENDING' : difference < 0 ? 'REFUND' : 'EVEN_EXCHANGE',
                notes: JSON.stringify({
                    reason: reason || 'Exchange',
                    originalTransactionId,
                    returnItems, newItems,
                    returnTotal: Math.round(returnTotal * 100) / 100,
                    newTotal: Math.round(newTotal * 100) / 100,
                    difference: Math.round(difference * 100) / 100
                }),
                items: {
                    create: [
                        ...returnItems.map(ri => ({
                            itemId: ri.itemId,
                            name: `RETURN: ${ri.itemId}`,
                            quantity: -ri.quantity,
                            unitPrice: 0,
                            total: 0
                        })),
                        ...newItems.map(ni => ({
                            itemId: ni.itemId,
                            name: `NEW: ${ni.itemId}`,
                            quantity: ni.quantity,
                            unitPrice: ni.price,
                            total: ni.price * ni.quantity
                        }))
                    ]
                }
            }
        })

        // Adjust inventory
        for (const ri of returnItems) {
            await prisma.item.update({
                where: { id: ri.itemId },
                data: { stock: { increment: ri.quantity } }
            }).catch(() => {}) // Item may not exist
        }
        for (const ni of newItems) {
            await prisma.item.update({
                where: { id: ni.itemId },
                data: { stock: { decrement: ni.quantity } }
            }).catch(() => {})
        }

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'EXCHANGE_PROCESSED', entityType: 'Transaction', entityId: exchange.id,
            details: { originalTransactionId, returnTotal, newTotal, difference: Math.round(difference * 100) / 100, reason }
        })

        return NextResponse.json({
            exchangeId: exchange.id,
            returnTotal: Math.round(returnTotal * 100) / 100,
            newTotal: Math.round(newTotal * 100) / 100,
            difference: Math.round(difference * 100) / 100,
            action: difference > 0 ? `Customer owes $${difference.toFixed(2)}` : difference < 0 ? `Refund $${Math.abs(difference).toFixed(2)} to customer` : 'Even exchange'
        })
    } catch (error: any) {
        console.error('[EXCHANGE_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to process exchange' }, { status: 500 })
    }
}
