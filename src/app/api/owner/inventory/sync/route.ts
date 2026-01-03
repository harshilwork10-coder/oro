import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Sync inventory across locations using StockOnHand
// Options:
// - Push items to multiple locations (create StockOnHand records)
// - Copy product catalog from one location to others
// - Sync stock levels between locations
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'OWNER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await request.json()
        const { action, sourceLocationId, targetLocationIds, itemIds, syncStock, initialStock } = body

        // Get user's franchise
        const franchiseId = user.franchiseId
        if (!franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        }

        // Validate locations belong to user's franchise
        if (user.role !== 'PROVIDER' && franchiseId) {
            const locations = await prisma.location.findMany({
                where: {
                    id: { in: [...targetLocationIds, sourceLocationId].filter(Boolean) },
                    franchiseId
                }
            })
            const expectedCount = targetLocationIds.length + (sourceLocationId ? 1 : 0)
            if (locations.length !== expectedCount) {
                return NextResponse.json({ error: 'Invalid locations' }, { status: 403 })
            }
        }

        let synced = 0

        switch (action) {
            case 'PUSH_ITEMS':
                // Push specific items to target locations (create/update StockOnHand)
                if (!itemIds || itemIds.length === 0) {
                    return NextResponse.json({ error: 'No items specified' }, { status: 400 })
                }

                const items = await prisma.item.findMany({
                    where: { id: { in: itemIds } },
                    include: {
                        stockOnHand: {
                            where: sourceLocationId ? { locationId: sourceLocationId } : undefined
                        }
                    }
                })

                for (const item of items) {
                    const sourceStock = item.stockOnHand[0]?.qtyOnHand || item.stock || 0

                    for (const targetId of targetLocationIds) {
                        // Upsert StockOnHand for this item at target location
                        await prisma.stockOnHand.upsert({
                            where: {
                                locationId_itemId: {
                                    locationId: targetId,
                                    itemId: item.id
                                }
                            },
                            create: {
                                locationId: targetId,
                                itemId: item.id,
                                franchiseId: item.franchiseId,
                                qtyOnHand: syncStock ? sourceStock : (initialStock ?? 0),
                                reorderPoint: item.reorderPoint
                            },
                            update: syncStock ? {
                                qtyOnHand: sourceStock
                            } : {}
                        })
                        synced++
                    }
                }
                break

            case 'COPY_ALL':
                // Copy all items from source to all targets
                if (!sourceLocationId) {
                    return NextResponse.json({ error: 'Source location required' }, { status: 400 })
                }

                const sourceItems = await prisma.item.findMany({
                    where: { franchiseId: franchiseId!, isActive: true, type: 'PRODUCT' },
                    select: { id: true, franchiseId: true, reorderPoint: true }
                })

                for (const item of sourceItems) {
                    for (const targetId of targetLocationIds) {
                        // Create StockOnHand if it doesn't exist
                        const existing = await prisma.stockOnHand.findUnique({
                            where: {
                                locationId_itemId: {
                                    locationId: targetId,
                                    itemId: item.id
                                }
                            }
                        })

                        if (!existing) {
                            await prisma.stockOnHand.create({
                                data: {
                                    locationId: targetId,
                                    itemId: item.id,
                                    franchiseId: item.franchiseId,
                                    qtyOnHand: initialStock ?? 0,
                                    reorderPoint: item.reorderPoint
                                }
                            })
                            synced++
                        }
                    }
                }
                break

            case 'SYNC_STOCK':
                // Sync stock levels from source to targets
                if (!sourceLocationId) {
                    return NextResponse.json({ error: 'Source location required' }, { status: 400 })
                }

                const sourceStockRecords = await prisma.stockOnHand.findMany({
                    where: { locationId: sourceLocationId }
                })

                for (const sourceRecord of sourceStockRecords) {
                    for (const targetId of targetLocationIds) {
                        await prisma.stockOnHand.upsert({
                            where: {
                                locationId_itemId: {
                                    locationId: targetId,
                                    itemId: sourceRecord.itemId
                                }
                            },
                            create: {
                                locationId: targetId,
                                itemId: sourceRecord.itemId,
                                franchiseId: sourceRecord.franchiseId,
                                qtyOnHand: sourceRecord.qtyOnHand,
                                reorderPoint: sourceRecord.reorderPoint
                            },
                            update: {
                                qtyOnHand: sourceRecord.qtyOnHand
                            }
                        })
                        synced++
                    }
                }
                break

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            synced,
            message: `Successfully synced ${synced} items`
        })

    } catch (error) {
        console.error('Inventory sync error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

