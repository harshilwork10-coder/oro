import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// SECURITY: JWT secret must match pin-login route
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_' + process.env.NEXTAUTH_SECRET?.slice(0, 16)

interface OfflineTransaction {
    offlineId: string
    items: {
        id: string
        name: string
        price: number
        quantity: number
        type: 'SERVICE' | 'PRODUCT'
        staffId?: string
    }[]
    subtotal: number
    tax: number
    total: number
    tip?: number
    paymentMethod: 'CASH' | 'CARD' | 'SPLIT'
    customerId?: string
    createdAt: string
    stationId?: string
    shiftId?: string
}

interface SyncResult {
    offlineId: string
    status: 'synced' | 'failed' | 'skipped'
    serverId?: string
    receiptNumber?: string
    error?: string
}

// Helper to verify mobile auth token from pin-login (JWT format)
function verifyMobileToken(authHeader: string | null): { userId: string; franchiseId: string; locationId: string | null } | null {
    if (!authHeader?.startsWith('Bearer ')) return null
    try {
        const token = authHeader.substring(7)
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; franchiseId: string; locationId: string | null; role: string }
        return { userId: payload.userId, franchiseId: payload.franchiseId, locationId: payload.locationId }
    } catch (error) {
        console.error('[SYNC] JWT verification failed:', error)
        return null
    }
}

// Generate receipt number
function generateReceiptNumber(): string {
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `${date}-${random}`
}

/**
 * POST /api/pos/sync
 * 
 * Batch upload pending offline transactions from Android app.
 * Uses receiptNumber prefix to detect duplicates (idempotency).
 */
export async function POST(req: NextRequest) {
    // Verify JWT token
    const mobileAuth = verifyMobileToken(req.headers.get('Authorization'))
    if (!mobileAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { franchiseId, locationId } = mobileAuth

    try {
        const body = await req.json()
        const { transactions } = body as { transactions: OfflineTransaction[] }

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return NextResponse.json({
                error: 'No transactions to sync',
                results: [],
                summary: { synced: 0, failed: 0, skipped: 0 }
            }, { status: 400 })
        }

        const results: SyncResult[] = []
        let synced = 0
        let failed = 0
        let skipped = 0

        for (const tx of transactions) {
            try {
                // IDEMPOTENCY: Use a receipt number based on offlineId to prevent duplicates
                const receiptNumber = `OFF-${tx.offlineId.substring(0, 12)}`

                // Check if already exists
                const existing = await prisma.transaction.findFirst({
                    where: {
                        franchiseId,
                        receiptNumber
                    }
                })

                if (existing) {
                    // Already synced - return existing server ID
                    results.push({
                        offlineId: tx.offlineId,
                        status: 'skipped',
                        serverId: existing.id,
                        receiptNumber: existing.receiptNumber || undefined
                    })
                    skipped++
                    continue
                }

                // Create the transaction
                const created = await prisma.transaction.create({
                    data: {
                        franchiseId,
                        locationId: locationId || undefined,
                        subtotal: tx.subtotal,
                        taxAmount: tx.tax,
                        total: tx.total,
                        tip: tx.tip || 0,
                        paymentMethod: tx.paymentMethod,
                        status: 'COMPLETED',
                        receiptNumber,
                        clientId: tx.customerId || undefined,
                        cashDrawerSessionId: tx.shiftId || undefined,
                        createdAt: new Date(tx.createdAt),
                        source: 'ANDROID_POS',
                        lineItems: {
                            create: tx.items.map((item, index) => ({
                                type: item.type,
                                name: item.name,
                                description: '',
                                price: item.price,
                                quantity: item.quantity,
                                subtotal: item.price * item.quantity,
                                total: item.price * item.quantity,
                                serviceId: item.type === 'SERVICE' && item.id !== 'open-item' ? item.id : undefined,
                                productId: item.type === 'PRODUCT' ? item.id : undefined,
                                staffId: item.staffId || undefined,
                                sequence: index
                            }))
                        }
                    }
                })

                results.push({
                    offlineId: tx.offlineId,
                    status: 'synced',
                    serverId: created.id,
                    receiptNumber: created.receiptNumber || undefined
                })
                synced++

            } catch (error) {
                console.error(`[SYNC] Failed to sync transaction ${tx.offlineId}:`, error)
                results.push({
                    offlineId: tx.offlineId,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
                failed++
            }
        }

        return NextResponse.json({
            success: true,
            results,
            summary: {
                synced,
                failed,
                skipped,
                total: transactions.length
            }
        })

    } catch (error) {
        console.error('[SYNC] Batch sync failed:', error)
        return NextResponse.json({
            error: 'Sync failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

/**
 * GET /api/pos/sync
 * 
 * Get sync status for this device/user.
 * Returns any transactions that might have been partially synced.
 */
export async function GET(req: NextRequest) {
    const mobileAuth = verifyMobileToken(req.headers.get('Authorization'))
    if (!mobileAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { franchiseId } = mobileAuth

    try {
        // Get recent transactions for reconciliation (those with OFF- prefix are from mobile)
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                receiptNumber: { startsWith: 'OFF-' },
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            },
            select: {
                id: true,
                receiptNumber: true,
                total: true,
                status: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json({
            transactions: recentTransactions,
            syncedCount: recentTransactions.length,
            lastSyncCheck: new Date().toISOString()
        })

    } catch (error) {
        console.error('[SYNC] Status check failed:', error)
        return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
    }
}
