import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch cash management data (counts, drops, deposits)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')
        const type = searchParams.get('type') // 'counts', 'drops', 'deposits', or null for all

        // Build location filter
        let locationFilter: any = {}

        if (user.role === 'PROVIDER') {
            if (locationId && locationId !== 'all') {
                locationFilter.locationId = locationId
            }
        } else if (user.franchiseId) {
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
        } else {
            return NextResponse.json({ counts: [], drops: [], deposits: [] })
        }

        const now = new Date()
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)

        const result: any = {}

        // Cash Counts
        if (!type || type === 'counts') {
            const counts = await prisma.cashCount.findMany({
                where: {
                    ...locationFilter,
                    createdAt: { gte: today }
                },
                include: {
                    location: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            })

            result.counts = counts.map(c => ({
                id: c.id,
                locationId: c.locationId,
                locationName: c.location.name,
                type: c.type,
                employeeName: c.employeeName,
                expectedCash: Number(c.expectedCash),
                countedCash: Number(c.countedCash),
                variance: Number(c.variance),
                createdAt: c.createdAt,
                approved: !!c.approvedById
            }))

            // Calculate variance summary
            result.varianceSummary = {
                totalOver: counts.filter(c => Number(c.variance) > 0).reduce((sum, c) => sum + Number(c.variance), 0),
                totalShort: counts.filter(c => Number(c.variance) < 0).reduce((sum, c) => sum + Math.abs(Number(c.variance)), 0),
                totalCounts: counts.length
            }
        }

        // Safe Drops
        if (!type || type === 'drops') {
            const drops = await prisma.safeDrop.findMany({
                where: {
                    ...locationFilter,
                    createdAt: { gte: today }
                },
                include: {
                    location: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            })

            result.drops = drops.map(d => ({
                id: d.id,
                locationId: d.locationId,
                locationName: d.location.name,
                amount: Number(d.amount),
                employeeName: d.employeeName,
                witnessedBy: d.witnessedByName,
                createdAt: d.createdAt
            }))

            result.dropsSummary = {
                totalDropped: drops.reduce((sum, d) => sum + Number(d.amount), 0),
                totalDrops: drops.length
            }
        }

        // Deposits
        if (!type || type === 'deposits') {
            const deposits = await prisma.depositLog.findMany({
                where: locationFilter,
                include: {
                    location: { select: { id: true, name: true } }
                },
                orderBy: { bankDate: 'desc' },
                take: 20
            })

            result.deposits = deposits.map(d => ({
                id: d.id,
                locationId: d.locationId,
                locationName: d.location.name,
                expectedAmount: Number(d.expectedAmount),
                depositedAmount: Number(d.depositedAmount),
                variance: Number(d.variance),
                status: d.status,
                bankDate: d.bankDate,
                slipNumber: d.slipNumber,
                loggedBy: d.loggedByName,
                reconciled: d.status === 'RECONCILED'
            }))

            // Pending deposits
            result.pendingDeposits = deposits.filter(d => d.status === 'PENDING').length
            result.overdueDeposits = deposits.filter(d => {
                if (d.status !== 'PENDING') return false
                const daysDiff = Math.floor((now.getTime() - new Date(d.bankDate).getTime()) / (1000 * 60 * 60 * 24))
                return daysDiff > 1
            }).length
        }

        // Get active drawer sessions for "current cash" status
        const activeSessions = await prisma.cashDrawerSession.findMany({
            where: {
                ...locationFilter,
                closedAt: null
            },
            include: {
                location: { select: { id: true, name: true } },
                employee: { select: { name: true } }
            }
        })

        result.activeDrawers = activeSessions.map(s => ({
            id: s.id,
            locationId: s.locationId,
            locationName: s.location.name,
            openedBy: s.employee?.name || 'Unknown',
            openedAt: s.createdAt,
            startingCash: Number(s.startingCash),
            expectedCash: Number(s.expectedCash)
        }))

        return NextResponse.json(result)

    } catch (error) {
        console.error('Cash management GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Create cash count, safe drop, or deposit log
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { type, locationId, ...data } = body

        if (!type || !locationId) {
            return NextResponse.json({ error: 'Missing type or locationId' }, { status: 400 })
        }

        // Verify location access
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        if (user.role !== 'PROVIDER' && location.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        let result: any

        switch (type) {
            case 'COUNT':
                // Cash count (open, mid-shift, close)
                const variance = Number(data.countedCash) - Number(data.expectedCash || 0)

                result = await prisma.cashCount.create({
                    data: {
                        locationId,
                        type: data.countType || 'MID_SHIFT',
                        employeeId: user.id,
                        employeeName: user.name,
                        expectedCash: data.expectedCash || 0,
                        countedCash: data.countedCash,
                        variance,
                        denominations: data.denominations ? JSON.stringify(data.denominations) : null,
                        note: data.note
                    }
                })
                break

            case 'DROP':
                // Safe drop
                result = await prisma.safeDrop.create({
                    data: {
                        locationId,
                        employeeId: user.id,
                        employeeName: user.name,
                        amount: data.amount,
                        witnessedById: data.witnessId,
                        witnessedByName: data.witnessName
                    }
                })
                break

            case 'DEPOSIT':
                // Deposit log
                result = await prisma.depositLog.create({
                    data: {
                        locationId,
                        expectedAmount: data.expectedAmount,
                        depositedAmount: data.depositedAmount,
                        variance: Number(data.depositedAmount) - Number(data.expectedAmount),
                        bankDate: new Date(data.bankDate || new Date()),
                        slipNumber: data.slipNumber,
                        slipImageUrl: data.slipImageUrl,
                        status: 'DEPOSITED',
                        loggedById: user.id,
                        loggedByName: user.name,
                        note: data.note
                    }
                })
                break

            default:
                return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        }

        return NextResponse.json({ success: true, data: result })

    } catch (error) {
        console.error('Cash management POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT - Reconcile deposit or approve variance
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only managers/owners can approve
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { type, id, action, note } = body

        if (type === 'DEPOSIT' && action === 'RECONCILE') {
            await prisma.depositLog.update({
                where: { id },
                data: {
                    status: 'RECONCILED',
                    reconciledById: user.id,
                    reconciledByName: user.name,
                    reconciledAt: new Date(),
                    note
                }
            })
        } else if (type === 'COUNT' && action === 'APPROVE') {
            await prisma.cashCount.update({
                where: { id },
                data: {
                    approvedById: user.id,
                    approvedByName: user.name,
                    approvedAt: new Date()
                }
            })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Cash management PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

