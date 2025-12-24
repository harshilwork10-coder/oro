import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - LP Audit Dashboard data
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')
        const days = parseInt(searchParams.get('days') || '7')

        // Build location filter
        let locationFilter: any = {}
        let franchiseId: string | null = null

        if (user.role === 'PROVIDER') {
            if (locationId && locationId !== 'all') {
                locationFilter.cashDrawerSession = { locationId }
            }
        } else if (user.franchiseId) {
            franchiseId = user.franchiseId
            const locations = await prisma.location.findMany({
                where: { franchiseId: user.franchiseId },
                select: { id: true }
            })
            const locationIds = locations.map(l => l.id)

            if (locationId && locationId !== 'all' && locationIds.includes(locationId)) {
                locationFilter.cashDrawerSession = { locationId }
            } else {
                locationFilter.cashDrawerSession = { locationId: { in: locationIds } }
            }
        }

        const now = new Date()
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - days)
        startDate.setHours(0, 0, 0, 0)

        // Get all transactions in date range
        const transactions = await prisma.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: startDate }
            },
            include: {
                employee: { select: { id: true, name: true } },
                cashDrawerSession: {
                    include: {
                        location: { select: { id: true, name: true } }
                    }
                }
            }
        })

        // Get voids and refunds
        const voidedTx = transactions.filter(t => t.status === 'VOIDED' || t.status === 'CANCELLED')
        const refundedTx = transactions.filter(t => t.status === 'REFUNDED')
        const completedTx = transactions.filter(t => t.status === 'COMPLETED')

        // Calculate employee stats
        const employeeStats: Map<string, {
            id: string
            name: string
            location: string
            totalTransactions: number
            voids: number
            refunds: number
            overrides: number
            noSales: number
            riskScore: number
        }> = new Map()

        transactions.forEach(tx => {
            const empId = tx.employeeId || 'UNKNOWN'
            const empName = tx.employee?.name || 'Unknown'
            const locName = tx.cashDrawerSession?.location?.name || 'Unknown'

            if (!employeeStats.has(empId)) {
                employeeStats.set(empId, {
                    id: empId,
                    name: empName,
                    location: locName,
                    totalTransactions: 0,
                    voids: 0,
                    refunds: 0,
                    overrides: 0,
                    noSales: 0,
                    riskScore: 0
                })
            }

            const stats = employeeStats.get(empId)!
            stats.totalTransactions++

            if (tx.status === 'VOIDED' || tx.status === 'CANCELLED') {
                stats.voids++
            }
            if (tx.status === 'REFUNDED') {
                stats.refunds++
            }
        })

        // Calculate risk scores (voids + refunds per 100 transactions)
        employeeStats.forEach(stats => {
            if (stats.totalTransactions > 0) {
                const incidents = stats.voids + stats.refunds + stats.overrides
                stats.riskScore = (incidents / stats.totalTransactions) * 100
            }
        })

        // Sort by risk score
        const suspiciousCashiers = Array.from(employeeStats.values())
            .filter(e => e.totalTransactions >= 5) // Min 5 transactions
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 10)
            .map(e => ({
                ...e,
                riskLevel: e.riskScore >= 10 ? 'HIGH' : e.riskScore >= 5 ? 'MEDIUM' : 'LOW'
            }))

        // Recent suspicious activity
        const recentAlerts = [
            ...voidedTx.map(tx => ({
                id: tx.id,
                type: 'VOID',
                amount: Number(tx.total),
                employeeName: tx.employee?.name || 'Unknown',
                locationName: tx.cashDrawerSession?.location?.name || 'Unknown',
                reason: tx.voidReason || '',
                time: tx.createdAt
            })),
            ...refundedTx.map(tx => ({
                id: tx.id,
                type: 'REFUND',
                amount: Number(tx.total),
                employeeName: tx.employee?.name || 'Unknown',
                locationName: tx.cashDrawerSession?.location?.name || 'Unknown',
                reason: tx.voidReason || '',
                time: tx.createdAt
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 20)

        // Summary stats
        const summary = {
            totalTransactions: completedTx.length,
            totalVoids: voidedTx.length,
            totalRefunds: refundedTx.length,
            voidAmount: voidedTx.reduce((sum, tx) => sum + Number(tx.total), 0),
            refundAmount: refundedTx.reduce((sum, tx) => sum + Number(tx.total), 0),
            voidRate: completedTx.length > 0 ? (voidedTx.length / completedTx.length * 100) : 0,
            refundRate: completedTx.length > 0 ? (refundedTx.length / completedTx.length * 100) : 0
        }

        // Get stored audit events if available
        let auditTrail: any[] = []
        try {
            const events = await prisma.auditEvent.findMany({
                where: {
                    ...(franchiseId ? { franchiseId } : {}),
                    ...(locationId && locationId !== 'all' ? { locationId } : {}),
                    createdAt: { gte: startDate }
                },
                include: {
                    location: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            })

            auditTrail = events.map(e => ({
                id: e.id,
                type: e.eventType,
                severity: e.severity,
                employeeName: e.employeeName,
                locationName: e.location.name,
                details: e.details ? JSON.parse(e.details) : null,
                amount: e.amount ? Number(e.amount) : null,
                time: e.createdAt,
                reviewed: !!e.reviewedById
            }))
        } catch (e) {
            // AuditEvent table may not exist yet
        }

        return NextResponse.json({
            suspiciousCashiers,
            recentAlerts,
            auditTrail,
            summary,
            dateRange: { start: startDate, end: now, days }
        })

    } catch (error) {
        console.error('LP Audit error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Log a new audit event
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { eventType, locationId, employeeId, employeeName, details, amount, transactionId, severity } = body

        if (!eventType || !locationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get franchise ID from location
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        const event = await prisma.auditEvent.create({
            data: {
                locationId,
                franchiseId: location.franchiseId,
                eventType,
                severity: severity || 'LOW',
                employeeId,
                employeeName,
                details: details ? JSON.stringify(details) : null,
                amount,
                transactionId
            }
        })

        return NextResponse.json({ success: true, event })

    } catch (error) {
        console.error('Audit event create error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT - Mark audit event as reviewed
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { eventId, note } = body

        await prisma.auditEvent.update({
            where: { id: eventId },
            data: {
                reviewedById: user.id,
                reviewedByName: user.name,
                reviewedAt: new Date(),
                reviewNote: note
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Audit review error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
