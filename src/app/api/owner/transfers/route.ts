import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List transfers
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const locationId = searchParams.get('locationId')

        // Build location filter
        let locationFilter: any = {}

        if (user.role === 'PROVIDER') {
            // Provider sees all
        } else if (user.franchiseId) {
            const locations = await prisma.location.findMany({
                where: { franchiseId: user.franchiseId },
                select: { id: true }
            })
            const locationIds = locations.map(l => l.id)
            locationFilter.OR = [
                { fromLocationId: { in: locationIds } },
                { toLocationId: { in: locationIds } }
            ]
        } else {
            return NextResponse.json({ transfers: [] })
        }

        // Additional filters
        if (locationId && locationId !== 'all') {
            locationFilter.OR = [
                { fromLocationId: locationId },
                { toLocationId: locationId }
            ]
        }

        if (status) {
            locationFilter.status = status
        }

        const transfers = await prisma.inventoryTransfer.findMany({
            where: locationFilter,
            include: {
                fromLocation: { select: { id: true, name: true } },
                toLocation: { select: { id: true, name: true } },
                items: {
                    include: {
                        item: { select: { id: true, name: true, barcode: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        // Group by status for UI
        const pending = transfers.filter(t => t.status === 'PENDING')
        const approved = transfers.filter(t => t.status === 'APPROVED')
        const inTransit = transfers.filter(t => t.status === 'IN_TRANSIT')
        const received = transfers.filter(t => ['RECEIVED', 'DISCREPANCY'].includes(t.status))
        const cancelled = transfers.filter(t => t.status === 'CANCELLED')

        return NextResponse.json({
            transfers,
            grouped: {
                pending,
                approved,
                inTransit,
                completed: received,
                cancelled
            },
            counts: {
                pending: pending.length,
                inTransit: inTransit.length + approved.length,
                completed: received.length,
                total: transfers.length
            }
        })

    } catch (error) {
        console.error('Transfers GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Create new transfer request
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { fromLocationId, toLocationId, reason, items } = body

        if (!fromLocationId || !toLocationId || !items || items.length === 0) {
            return NextResponse.json({
                error: 'Missing required fields: fromLocationId, toLocationId, items'
            }, { status: 400 })
        }

        if (fromLocationId === toLocationId) {
            return NextResponse.json({
                error: 'Cannot transfer to the same location'
            }, { status: 400 })
        }

        // Verify locations exist and user has access
        const [fromLocation, toLocation] = await Promise.all([
            prisma.location.findUnique({ where: { id: fromLocationId }, select: { id: true, franchiseId: true } }),
            prisma.location.findUnique({ where: { id: toLocationId }, select: { id: true, franchiseId: true } })
        ])

        if (!fromLocation || !toLocation) {
            return NextResponse.json({ error: 'Invalid location(s)' }, { status: 400 })
        }

        // For non-providers, verify franchise access
        if (user.role !== 'PROVIDER') {
            if (fromLocation.franchiseId !== user.franchiseId || toLocation.franchiseId !== user.franchiseId) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }
        }

        // Generate transfer number
        const lastTransfer = await prisma.inventoryTransfer.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { transferNumber: true }
        })

        let nextNumber = 1
        if (lastTransfer?.transferNumber) {
            const match = lastTransfer.transferNumber.match(/TR-(\d+)/)
            if (match) nextNumber = parseInt(match[1]) + 1
        }
        const transferNumber = `TR-${String(nextNumber).padStart(4, '0')}`

        // Calculate totals
        let totalItems = 0
        let totalValue = 0

        // Validate items and get details
        const itemDetails = await Promise.all(
            items.map(async (item: { itemId: string, quantity: number }) => {
                const product = await prisma.item.findUnique({
                    where: { id: item.itemId },
                    select: { id: true, name: true, sku: true, barcode: true, cost: true, stock: true }
                })

                if (!product) {
                    throw new Error(`Item ${item.itemId} not found`)
                }

                totalItems += item.quantity
                const costNum = Number(product.cost || 0)
                totalValue += costNum * item.quantity

                return {
                    itemId: product.id,
                    itemName: product.name,
                    itemSku: product.sku,
                    itemBarcode: product.barcode,
                    quantitySent: item.quantity,
                    unitCost: costNum
                }
            })
        )

        // Create transfer with items
        const transfer = await prisma.inventoryTransfer.create({
            data: {
                transferNumber,
                fromLocationId,
                toLocationId,
                status: 'PENDING',
                reason,
                requestedById: user.id,
                requestedByName: user.name,
                totalItems,
                totalValue,
                items: {
                    create: itemDetails
                }
            },
            include: {
                fromLocation: { select: { name: true } },
                toLocation: { select: { name: true } },
                items: true
            }
        })

        return NextResponse.json({
            success: true,
            transfer,
            message: `Transfer ${transferNumber} created successfully`
        })

    } catch (error: any) {
        console.error('Transfers POST error:', error)
        return NextResponse.json({
            error: error.message || 'Server error'
        }, { status: 500 })
    }
}

// PUT - Update transfer status (approve, ship, receive, cancel)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { transferId, action, receivedItems, notes } = body

        if (!transferId || !action) {
            return NextResponse.json({ error: 'Missing transferId or action' }, { status: 400 })
        }

        const transfer = await prisma.inventoryTransfer.findUnique({
            where: { id: transferId },
            include: { items: true }
        })

        if (!transfer) {
            return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
        }

        const now = new Date()
        let updateData: any = {}

        switch (action) {
            case 'APPROVE':
                if (transfer.status !== 'PENDING') {
                    return NextResponse.json({ error: 'Can only approve pending transfers' }, { status: 400 })
                }
                updateData = {
                    status: 'APPROVED',
                    approvedById: user.id,
                    approvedByName: user.name,
                    approvedAt: now
                }
                break

            case 'SHIP':
                if (!['PENDING', 'APPROVED'].includes(transfer.status)) {
                    return NextResponse.json({ error: 'Invalid status for shipping' }, { status: 400 })
                }

                // Deduct stock from source location
                for (const item of transfer.items) {
                    await prisma.item.update({
                        where: { id: item.itemId },
                        data: { stock: { decrement: item.quantitySent } }
                    })
                }

                updateData = {
                    status: 'IN_TRANSIT',
                    shippedById: user.id,
                    shippedByName: user.name,
                    shippedAt: now,
                    approvedById: transfer.approvedById || user.id,
                    approvedByName: transfer.approvedByName || user.name,
                    approvedAt: transfer.approvedAt || now
                }
                break

            case 'RECEIVE':
                if (transfer.status !== 'IN_TRANSIT') {
                    return NextResponse.json({ error: 'Can only receive in-transit transfers' }, { status: 400 })
                }

                // Update received quantities and add to destination stock
                let hasDiscrepancy = false

                for (const item of transfer.items) {
                    const received = receivedItems?.find((r: any) => r.itemId === item.itemId)
                    const receivedQty = received?.quantity ?? item.quantitySent

                    if (receivedQty !== item.quantitySent) {
                        hasDiscrepancy = true
                    }

                    // Update transfer item with received quantity
                    await prisma.transferItem.update({
                        where: { id: item.id },
                        data: {
                            quantityReceived: receivedQty,
                            discrepancyNote: received?.note
                        }
                    })

                    // Add stock to destination (we need to find the item at destination)
                    // For now, just update the source item's stock
                    await prisma.item.update({
                        where: { id: item.itemId },
                        data: { stock: { increment: receivedQty } }
                    })
                }

                updateData = {
                    status: hasDiscrepancy ? 'DISCREPANCY' : 'RECEIVED',
                    receivedById: user.id,
                    receivedByName: user.name,
                    receivedAt: now,
                    notes
                }
                break

            case 'CANCEL':
                if (['RECEIVED', 'DISCREPANCY'].includes(transfer.status)) {
                    return NextResponse.json({ error: 'Cannot cancel completed transfers' }, { status: 400 })
                }

                // If already shipped, restore stock
                if (transfer.status === 'IN_TRANSIT') {
                    for (const item of transfer.items) {
                        await prisma.item.update({
                            where: { id: item.itemId },
                            data: { stock: { increment: item.quantitySent } }
                        })
                    }
                }

                updateData = {
                    status: 'CANCELLED',
                    notes: notes || 'Cancelled by user'
                }
                break

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        const updated = await prisma.inventoryTransfer.update({
            where: { id: transferId },
            data: updateData,
            include: {
                fromLocation: { select: { name: true } },
                toLocation: { select: { name: true } },
                items: true
            }
        })

        return NextResponse.json({
            success: true,
            transfer: updated,
            message: `Transfer ${action.toLowerCase()}ed successfully`
        })

    } catch (error) {
        console.error('Transfers PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

