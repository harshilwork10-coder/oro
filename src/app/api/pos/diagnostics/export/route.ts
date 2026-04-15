import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pos/diagnostics/export — Generate full support bundle
 *
 * Creates a comprehensive JSON bundle for support ticket attachment.
 * Includes: station info, recent errors, shift history, config, and environment.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const stationId = searchParams.get('stationId')
        const hours = parseInt(searchParams.get('hours') || '4')
        const since = new Date(Date.now() - hours * 60 * 60 * 1000)

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

        // Recent audit events
        const recentEvents = await prisma.auditLog.findMany({
            where: {
                createdAt: { gte: since },
                changes: { contains: user.franchiseId },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                action: true,
                status: true,
                entityType: true,
                entityId: true,
                createdAt: true,
                userEmail: true,
            },
        })

        // Recent transactions
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: { gte: since },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                status: true,
                total: true,
                paymentMethod: true,
                createdAt: true,
            },
        })

        // Franchise config
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: {
                name: true,
                primaryVertical: true,
                subscriptionTier: true,
                taxRate: true,
            },
        })

        // DB health
        let dbHealthy = false
        try {
            await prisma.$queryRaw`SELECT 1`
            dbHealthy = true
        } catch {}

        const bundle = {
            _meta: {
                generatedAt: new Date().toISOString(),
                generatedBy: user.email,
                bundleVersion: '1.0',
                periodHours: hours,
                environment: process.env.NODE_ENV || 'unknown',
            },
            health: {
                database: dbHealthy ? 'PASS' : 'FAIL',
                station: station ? (station.isTrusted ? 'PAIRED' : 'UNTRUSTED') : 'N/A',
                terminal: station?.dedicatedTerminal ? 'ASSIGNED' : 'NONE',
            },
            franchise,
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
                display: station.displayProfile,
            } : null,
            recentEvents: recentEvents.map(e => ({
                action: e.action,
                status: e.status,
                entity: `${e.entityType}:${e.entityId}`,
                user: e.userEmail,
                time: e.createdAt,
            })),
            recentTransactions: recentTransactions.map(t => ({
                id: t.id,
                status: t.status,
                total: Number(t.total),
                method: t.paymentMethod,
                time: t.createdAt,
            })),
            transactionSummary: {
                total: recentTransactions.length,
                completed: recentTransactions.filter(t => t.status === 'COMPLETED').length,
                voided: recentTransactions.filter(t => t.status === 'VOIDED').length,
                pending: recentTransactions.filter(t => ['PENDING', 'IN_PROGRESS'].includes(t.status)).length,
                refunded: recentTransactions.filter(t => t.status === 'REFUNDED').length,
            },
        }

        return NextResponse.json(bundle)
    } catch (error: any) {
        console.error('[DIAGNOSTICS_EXPORT]', error)
        return NextResponse.json({ error: 'Support bundle generation failed' }, { status: 500 })
    }
}
