/**
 * Rebooking Suggestions API
 * GET /api/pos/rebooking-suggestions/[clientId]
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const { locationId } = ctx
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const clientId = segments[segments.length - 1]

    try {
        const pastAppointments = await prisma.appointment.findMany({
            where: { clientId, locationId, status: { in: ['COMPLETED', 'CHECKED_OUT'] } },
            orderBy: { startTime: 'desc' },
            take: 10,
            include: { service: { select: { name: true } } }
        })

        if (pastAppointments.length === 0) {
            return NextResponse.json({ success: true, data: [] })
        }

        const serviceIntervals: Record<string, { totalDays: number; count: number; lastDate: Date }> = {}
        pastAppointments.forEach(apt => {
            const svc = apt.service?.name || 'General'
            if (!serviceIntervals[svc]) {
                serviceIntervals[svc] = { totalDays: 0, count: 0, lastDate: apt.startTime! }
            } else {
                const daysDiff = Math.abs((serviceIntervals[svc].lastDate.getTime() - apt.startTime!.getTime()) / 86400000)
                serviceIntervals[svc].totalDays += daysDiff
                serviceIntervals[svc].count++
                serviceIntervals[svc].lastDate = apt.startTime!
            }
        })

        const suggestions = Object.entries(serviceIntervals).map(([serviceName, data]) => {
            const avgDays = data.count > 0 ? Math.round(data.totalDays / data.count) : 28
            const intervalWeeks = Math.max(2, Math.round(avgDays / 7))
            const suggestedDate = new Date()
            suggestedDate.setDate(suggestedDate.getDate() + avgDays)
            const day = suggestedDate.getDay()
            if (day === 0) suggestedDate.setDate(suggestedDate.getDate() + 1)
            if (day === 6) suggestedDate.setDate(suggestedDate.getDate() + 2)
            return {
                serviceName, suggestedDate: suggestedDate.toISOString().split('T')[0],
                suggestedTime: '10:00',
                reason: `Based on ${data.count + 1} visits, avg every ${intervalWeeks} weeks`,
                intervalWeeks
            }
        })

        return NextResponse.json({ success: true, data: suggestions })
    } catch (error) {
        console.error('[REBOOKING_SUGGESTIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }
})
