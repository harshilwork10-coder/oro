import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all active exceptions for owner dashboard
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only owners and providers can see exceptions
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'ACTIVE'
        const severity = searchParams.get('severity')
        const locationId = searchParams.get('locationId')

        // Build location filter based on role
        let locationFilter: any = {}

        if (user.role === 'PROVIDER') {
            // Provider sees all
            if (locationId && locationId !== 'all') {
                locationFilter.locationId = locationId
            }
        } else if (user.franchiseId) {
            // Get all locations for this franchise
            const locations = await prisma.location.findMany({
                where: { franchiseId: user.franchiseId },
                select: { id: true }
            })
            const locationIds = locations.map(l => l.id)

            if (locationId && locationId !== 'all' && locationIds.includes(locationId)) {
                locationFilter.locationId = locationId
            } else {
                locationFilter.locationId = { in: locationIds }
            }
        }

        // Fetch stored exceptions
        const exceptions = await prisma.storeException.findMany({
            where: {
                ...locationFilter,
                status,
                ...(severity ? { severity } : {})
            },
            include: {
                location: { select: { id: true, name: true } }
            },
            orderBy: [
                { severity: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 50
        })

        // Also generate real-time exceptions from data
        const realTimeExceptions = await generateRealTimeExceptions(
            user.role === 'PROVIDER' ? null : user.franchiseId,
            locationId !== 'all' ? locationId : null
        )

        // Combine stored + real-time, dedupe by type+location
        const combined = [...exceptions.map(e => ({
            id: e.id,
            type: e.exceptionType,
            severity: e.severity,
            title: e.title,
            description: e.description,
            status: e.status,
            locationId: e.locationId,
            locationName: e.location.name,
            createdAt: e.createdAt,
            stored: true
        })), ...realTimeExceptions]

        // Group by severity
        const critical = combined.filter(e => e.severity === 'CRITICAL')
        const warning = combined.filter(e => e.severity === 'WARNING')
        const info = combined.filter(e => e.severity === 'INFO')

        return NextResponse.json({
            exceptions: combined,
            counts: {
                critical: critical.length,
                warning: warning.length,
                info: info.length,
                total: combined.length
            },
            grouped: { critical, warning, info }
        })

    } catch (error) {
        console.error('Exceptions error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Acknowledge or resolve an exception
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { exceptionId, action, note } = body

        if (!exceptionId || !action) {
            return NextResponse.json({ error: 'Missing exceptionId or action' }, { status: 400 })
        }

        const exception = await prisma.storeException.findUnique({
            where: { id: exceptionId }
        })

        if (!exception) {
            return NextResponse.json({ error: 'Exception not found' }, { status: 404 })
        }

        // Update based on action
        if (action === 'ACKNOWLEDGE') {
            await prisma.storeException.update({
                where: { id: exceptionId },
                data: {
                    status: 'ACKNOWLEDGED',
                    acknowledgedById: user.id,
                    acknowledgedByName: user.name,
                    acknowledgedAt: new Date()
                }
            })
        } else if (action === 'RESOLVE') {
            await prisma.storeException.update({
                where: { id: exceptionId },
                data: {
                    status: 'RESOLVED',
                    resolvedById: user.id,
                    resolvedByName: user.name,
                    resolvedAt: new Date(),
                    resolutionNote: note
                }
            })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Exception update error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// Generate real-time exceptions from current data
async function generateRealTimeExceptions(franchiseId: string | null, locationId: string | null) {
    const exceptions: any[] = []
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    // Get locations to check
    let locationFilter: any = {}
    if (locationId) {
        locationFilter.id = locationId
    } else if (franchiseId) {
        locationFilter.franchiseId = franchiseId
    }

    const locations = await prisma.location.findMany({
        where: locationFilter,
        select: { id: true, name: true, franchiseId: true }
    })

    for (const location of locations) {
        // 1. LOW STOCK ALERTS
        const lowStockCount = await prisma.item.count({
            where: {
                franchiseId: location.franchiseId,
                isActive: true,
                stock: { lte: 5, gt: 0 }
            }
        })

        if (lowStockCount > 0) {
            exceptions.push({
                id: `low-stock-${location.id}`,
                type: 'LOW_STOCK',
                severity: lowStockCount > 10 ? 'WARNING' : 'INFO',
                title: `${lowStockCount} items low in stock`,
                description: `${location.name} has ${lowStockCount} products with stock ≤ 5`,
                locationId: location.id,
                locationName: location.name,
                createdAt: now,
                stored: false
            })
        }

        // 2. OUT OF STOCK
        const outOfStockCount = await prisma.item.count({
            where: {
                franchiseId: location.franchiseId,
                isActive: true,
                stock: { lte: 0 }
            }
        })

        if (outOfStockCount > 0) {
            exceptions.push({
                id: `out-of-stock-${location.id}`,
                type: 'OUT_OF_STOCK',
                severity: 'WARNING',
                title: `${outOfStockCount} items out of stock`,
                description: `${location.name} has ${outOfStockCount} products with zero stock`,
                locationId: location.id,
                locationName: location.name,
                createdAt: now,
                stored: false
            })
        }

        // 3. VOID/REFUND SPIKE (more than 3 today)
        const voidCount = await prisma.transaction.count({
            where: {
                cashDrawerSession: { locationId: location.id },
                createdAt: { gte: today },
                status: { in: ['VOIDED', 'CANCELLED'] }
            }
        })

        if (voidCount >= 3) {
            exceptions.push({
                id: `void-spike-${location.id}`,
                type: 'VOID_SPIKE',
                severity: voidCount >= 5 ? 'CRITICAL' : 'WARNING',
                title: `${voidCount} voids today`,
                description: `${location.name} has ${voidCount} voided transactions today`,
                locationId: location.id,
                locationName: location.name,
                createdAt: now,
                stored: false
            })
        }

        const refundCount = await prisma.transaction.count({
            where: {
                cashDrawerSession: { locationId: location.id },
                createdAt: { gte: today },
                status: 'REFUNDED'
            }
        })

        if (refundCount >= 3) {
            exceptions.push({
                id: `refund-spike-${location.id}`,
                type: 'REFUND_SPIKE',
                severity: refundCount >= 5 ? 'CRITICAL' : 'WARNING',
                title: `${refundCount} refunds today`,
                description: `${location.name} has ${refundCount} refunded transactions today`,
                locationId: location.id,
                locationName: location.name,
                createdAt: now,
                stored: false
            })
        }
    }

    return exceptions
}

