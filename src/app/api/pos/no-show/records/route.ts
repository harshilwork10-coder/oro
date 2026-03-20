/**
 * No-Show Protection API
 * GET  /api/pos/no-show/records
 * POST /api/pos/no-show/records
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    const { locationId } = ctx
    try {
        const noShows = await prisma.appointment.findMany({
            where: { locationId, status: 'NO_SHOW' },
            orderBy: { startTime: 'desc' },
            take: 100
        })
        // Batch-fetch client & service names
        const clientIds = [...new Set(noShows.map(n => n.clientId).filter(Boolean))]
        const serviceIds = [...new Set(noShows.map(n => n.serviceId).filter(Boolean))]
        const [clients, services] = await Promise.all([
            clientIds.length ? prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, firstName: true, lastName: true, phone: true } }) : [],
            serviceIds.length ? prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }) : []
        ])
        const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
        const svcMap = Object.fromEntries(services.map(s => [s.id, s.name]))

        // Count per client
        const counts: Record<string, number> = {}
        noShows.forEach(ns => { if (ns.clientId) counts[ns.clientId] = (counts[ns.clientId] || 0) + 1 })

        const records = noShows.map(ns => {
            const c = ns.clientId ? clientMap[ns.clientId] : null
            return {
                id: ns.id,
                clientName: c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : 'Walk-in',
                clientPhone: c?.phone || '',
                date: ns.startTime?.toISOString() || '',
                serviceName: ns.serviceId ? (svcMap[ns.serviceId] || '') : '',
                noShowCount: ns.clientId ? (counts[ns.clientId] || 1) : 1,
                riskScore: ns.clientId ? Math.min(100, (counts[ns.clientId] || 1) * 25) : 25
            }
        })
        return NextResponse.json({ success: true, data: records })
    } catch (error) {
        console.error('[NO_SHOW_RECORDS]', error)
        return NextResponse.json({ error: 'Failed to load no-show records' }, { status: 500 })
    }
})

export const POST = withPOSAuth(async (req: Request, ctx: POSContext) => {
    try {
        const { appointmentId } = await req.json()
        if (appointmentId) {
            // BUG-3 FIX: Verify appointment belongs to this location before updating
            const appointment = await prisma.appointment.findFirst({
                where: { id: appointmentId, locationId: ctx.locationId }
            })
            if (!appointment) {
                return NextResponse.json({ error: 'Appointment not found at this location' }, { status: 404 })
            }
            await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'NO_SHOW' } })
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[NO_SHOW_RECORD]', error)
        return NextResponse.json({ error: 'Failed to record no-show' }, { status: 500 })
    }
})
