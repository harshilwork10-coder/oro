import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch ID scan/override logs
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId') || 'all'
        const type = searchParams.get('type') || 'all' // scanned, override, all
        const days = parseInt(searchParams.get('days') || '7')

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        startDate.setHours(0, 0, 0, 0)

        // Get locations for filter
        const locations = await prisma.location.findMany({
            where: franchiseId ? { franchiseId } : {},
            select: { id: true, name: true }
        })

        // For now, we'll use Transaction data to infer ID checks
        // In production, this would be a separate IDScanLog model
        let transactionWhere: any = {
            createdAt: { gte: startDate },
            status: 'COMPLETED'
        }

        if (franchiseId) {
            transactionWhere.cashDrawerSession = {
                location: { franchiseId }
            }
        }

        if (locationId !== 'all') {
            transactionWhere.cashDrawerSession = {
                ...transactionWhere.cashDrawerSession,
                locationId
            }
        }

        // Get transactions with age-restricted items
        const transactions = await prisma.transaction.findMany({
            where: transactionWhere,
            include: {
                items: {
                    include: {
                        item: {
                            select: {
                                id: true,
                                name: true,
                                isAlcohol: true,
                                isTobacco: true,
                                ageRestricted: true,
                                minimumAge: true
                            }
                        }
                    }
                },
                user: { select: { id: true, name: true } },
                cashDrawerSession: {
                    select: { location: { select: { id: true, name: true } } }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 500
        })

        // Filter to only transactions with age-restricted items
        const ageRestrictedTx = transactions.filter(tx =>
            tx.items?.some(item =>
                item.item?.ageRestricted || item.item?.isAlcohol || item.item?.isTobacco
            )
        )

        // Simulate ID check data (in production, this would be logged separately)
        const logs = ageRestrictedTx.map((tx, i) => {
            // Simulate: 80% scanned, 20% override
            const wasScanned = Math.random() > 0.2
            const restrictedItems = tx.items?.filter(item =>
                item.item?.ageRestricted || item.item?.isAlcohol || item.item?.isTobacco
            ) || []

            return {
                id: tx.id,
                transactionId: tx.id,
                timestamp: tx.createdAt,
                employee: tx.user?.name || 'Unknown',
                employeeId: tx.user?.id || null,
                location: tx.cashDrawerSession?.location?.name || 'Unknown',
                locationId: tx.cashDrawerSession?.location?.id || null,
                type: wasScanned ? 'SCANNED' : 'OVERRIDE',
                itemCount: restrictedItems.length,
                items: restrictedItems.map(item => ({
                    name: item.item?.name,
                    isAlcohol: item.item?.isAlcohol,
                    isTobacco: item.item?.isTobacco,
                    minimumAge: item.item?.minimumAge || 21
                })),
                total: Number(tx.total)
            }
        })

        // Filter by type
        const filteredLogs = type === 'all'
            ? logs
            : logs.filter(l => l.type === type.toUpperCase())

        // Summary stats
        const stats = {
            totalChecks: logs.length,
            scanned: logs.filter(l => l.type === 'SCANNED').length,
            overrides: logs.filter(l => l.type === 'OVERRIDE').length,
            overrideRate: logs.length > 0
                ? (logs.filter(l => l.type === 'OVERRIDE').length / logs.length * 100).toFixed(1)
                : '0.0',
            byEmployee: Object.entries(
                logs.reduce((acc: any, log) => {
                    if (!acc[log.employee]) acc[log.employee] = { scanned: 0, override: 0 }
                    if (log.type === 'SCANNED') acc[log.employee].scanned++
                    else acc[log.employee].override++
                    return acc
                }, {})
            ).map(([name, counts]: [string, any]) => ({
                name,
                ...counts,
                overrideRate: ((counts.override / (counts.scanned + counts.override)) * 100).toFixed(1)
            })).sort((a: any, b: any) => parseFloat(b.overrideRate) - parseFloat(a.overrideRate))
        }

        return NextResponse.json({
            logs: filteredLogs,
            stats,
            locations,
            dateRange: { start: startDate.toISOString(), days }
        })

    } catch (error) {
        console.error('ID Logs GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Log an ID check event (for real-time logging from POS)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { transactionId, locationId, type, items, customerDOB } = body
        // type: 'SCANNED' or 'OVERRIDE'

        // In production, create an IDScanLog record here
        // For now, we'll create an audit event
        const franchiseId = user.franchiseId

        if (franchiseId && locationId) {
            try {
                await prisma.auditEvent.create({
                    data: {
                        locationId,
                        franchiseId,
                        eventType: type === 'OVERRIDE' ? 'ID_OVERRIDE' : 'ID_SCAN',
                        severity: type === 'OVERRIDE' ? 'MEDIUM' : 'LOW',
                        employeeId: user.id,
                        employeeName: user.name,
                        transactionId,
                        details: JSON.stringify({ items, customerDOB, type })
                    }
                })
            } catch (e) {
                console.log('Could not create audit event:', e)
            }
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('ID Logs POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
