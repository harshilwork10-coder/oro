import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get franchisor record for this user
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id },
            select: {
                id: true,
                name: true,
                approvalStatus: true,
                createdAt: true,
                businessType: true,
                brandCode: true,
                franchises: {
                    include: {
                        owner: {
                            select: { id: true, name: true, email: true }
                        },
                        locations: {
                            include: {
                                users: true
                            }
                        },
                        transactions: {
                            where: {
                                createdAt: {
                                    gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Last 60 days for period comparison
                                }
                            },
                            select: {
                                total: true,
                                createdAt: true,
                            }
                        }
                    }
                }
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        if (franchisor.businessType !== 'BRAND_FRANCHISOR') {
            return NextResponse.json({ error: 'Access denied. Not a Brand Franchisor.' }, { status: 403 })
        }

        // ═══ Period boundaries ═══
        const now = Date.now()
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
        const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000)

        // ═══ Per-franchisee breakdown ═══
        const franchiseeBreakdown = franchisor.franchises.map(f => {
            const currentPeriodTxns = f.transactions.filter(t => new Date(t.createdAt) >= thirtyDaysAgo)
            const priorPeriodTxns = f.transactions.filter(
                t => new Date(t.createdAt) >= sixtyDaysAgo && new Date(t.createdAt) < thirtyDaysAgo
            )

            const monthlyRevenue = currentPeriodTxns.reduce((sum, tx) => sum + Number(tx.total), 0)
            const priorRevenue = priorPeriodTxns.reduce((sum, tx) => sum + Number(tx.total), 0)
            const employeeCount = f.locations.reduce((sum, l) => sum + l.users.length, 0)

            // Status derivation:
            // - 'warning' if 0 revenue AND has locations that should be active
            // - 'pending' if no locations yet
            // - 'active' otherwise
            let status: 'active' | 'warning' | 'pending' = 'active'
            if (f.locations.length === 0) {
                status = 'pending'
            } else if (monthlyRevenue === 0 && f.locations.length > 0) {
                status = 'warning'
            }

            return {
                id: f.id,
                name: f.owner?.name || f.owner?.email || `Franchisee ${f.id.slice(0, 6)}`,
                locationCount: f.locations.length,
                monthlyRevenue,
                priorRevenue,
                transactionCount: currentPeriodTxns.length,
                employeeCount,
                status,
                // complianceScore: null — not yet available, omitted per operational truth policy
            }
        })

        // ═══ Aggregate stats ═══
        const totalLocations = franchisor.franchises.reduce((sum, f) => sum + f.locations.length, 0)
        const totalEmployees = franchiseeBreakdown.reduce((sum, f) => sum + f.employeeCount, 0)
        const totalFranchisees = franchisor.franchises.length
        const monthlyRevenue = franchiseeBreakdown.reduce((sum, f) => sum + f.monthlyRevenue, 0)
        const priorPeriodRevenue = franchiseeBreakdown.reduce((sum, f) => sum + f.priorRevenue, 0)
        const totalTransactions = franchiseeBreakdown.reduce((sum, f) => sum + f.transactionCount, 0)

        // ═══ Location status breakdown ═══
        const allLocations = franchisor.franchises.flatMap(f => f.locations)
        const locationBreakdown = {
            active: allLocations.filter(l => l.users.length > 0).length,
            pending: allLocations.filter(l => l.users.length === 0).length,
            offline: 0, // Future: track offline status from heartbeat
        }

        // ═══ Pending items for Action Center ═══
        const pendingItems = {
            stationRequests: 0, // Future: query StationRequest table
            pendingLocations: locationBreakdown.pending,
            underperformingFranchisees: franchiseeBreakdown.filter(
                f => f.status === 'warning' && f.locationCount > 0
            ).length,
        }

        return NextResponse.json({
            approvalStatus: franchisor.approvalStatus,
            name: franchisor.name || 'Your Brand',
            brandCode: franchisor.brandCode,
            createdAt: franchisor.createdAt,
            
            // Aggregates
            totalFranchisees,
            totalLocations,
            totalEmployees,
            totalTransactions,
            monthlyRevenue,
            priorPeriodRevenue,
            
            // Per-franchisee breakdown
            franchisees: franchiseeBreakdown,
            
            // Location status
            locationBreakdown,
            
            // Action center data
            pendingItems,
            
            // Data freshness
            fetchedAt: new Date().toISOString(),
        })

    } catch (error) {
        console.error('Error fetching brand dashboard stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        )
    }
}
