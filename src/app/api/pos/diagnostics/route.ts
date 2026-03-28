import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pos/diagnostics — Device setup and support diagnostic endpoint
 *
 * Returns comprehensive station + environment info for support troubleshooting.
 * Available to any authenticated POS user (meant for on-device use).
 *
 * Query params: ?stationId=xxx
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const stationId = searchParams.get('stationId')

        // Station info
        let station = null
        if (stationId) {
            station = await prisma.station.findFirst({
                where: { id: stationId, location: { franchiseId: user.franchiseId } },
                include: {
                    location: { select: { id: true, name: true, address: true } },
                    dedicatedTerminal: { select: { id: true, name: true, status: true, serialNumber: true } },
                    displayProfile: true,
                },
            })
        }

        // Franchise settings
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: {
                name: true,
                primaryVertical: true,
                subscriptionTier: true,
                taxRate: true,
            },
        })

        // DB connectivity check
        let dbHealthy = false
        try {
            await prisma.$queryRaw`SELECT 1`
            dbHealthy = true
        } catch {}

        // Recent error count (last hour)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const recentErrors = await prisma.auditLog.count({
            where: {
                status: 'FAILURE',
                createdAt: { gte: hourAgo },
                changes: { contains: user.franchiseId },
            },
        })

        return NextResponse.json({
            diagnostics: {
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'unknown',
                dbHealthy,
                recentErrors,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    franchiseId: user.franchiseId,
                },
                franchise: franchise ? {
                    name: franchise.name,
                    vertical: franchise.primaryVertical,
                    tier: franchise.subscriptionTier,
                    taxRate: franchise.taxRate ? Number(franchise.taxRate) : null,
                } : null,
                station: station ? {
                    id: station.id,
                    name: station.name,
                    isActive: station.isActive,
                    trainingMode: station.trainingMode,
                    pairingStatus: station.pairingStatus,
                    isTrusted: station.isTrusted,
                    lastHeartbeat: station.lastHeartbeatAt,
                    paymentMode: station.paymentMode,
                    location: station.location,
                    terminal: station.dedicatedTerminal,
                    display: station.displayProfile ? {
                        mode: station.displayProfile.displayMode,
                        driver: station.displayProfile.driver,
                    } : null,
                } : null,
                checks: {
                    database: dbHealthy ? 'PASS' : 'FAIL',
                    auth: 'PASS', // If we got here, auth works
                    station: station ? (station.isTrusted ? 'PAIRED' : 'UNTRUSTED') : 'NOT_CHECKED',
                    terminal: station?.dedicatedTerminal ? 'ASSIGNED' : 'NONE',
                    display: station?.displayProfile ? 'CONFIGURED' : 'NONE',
                },
            },
        })
    } catch (error: any) {
        console.error('[DIAGNOSTICS]', error)
        return NextResponse.json({ error: 'Diagnostics failed' }, { status: 500 })
    }
}
