/**
 * Scheduled Reports API
 *
 * POST — Save report schedule preferences (stored in auditLog as config records)
 * GET  — List saved report schedules
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// POST — Save a scheduled report preference
export async function POST(req: NextRequest) {
    try {
        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role || '')) {
            return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
        }

        const body = await req.json()
        const { email, reportType, frequency, time, enabled } = body as {
            email: string
            reportType: string
            frequency: string
            time?: string
            enabled: boolean
        }

        if (!email || !reportType || !frequency) {
            return NextResponse.json({ error: 'email, reportType, and frequency required' }, { status: 400 })
        }

        // Store schedule config as JSON in auditLog
        const scheduleKey = `REPORT_SCHEDULE_${reportType}`
        const config = JSON.stringify({ email, reportType, frequency, time: time || '07:00', enabled })

        // Check for existing schedule
        const existing = await prisma.auditLog.findFirst({
            where: { userId: user.id, action: scheduleKey }
        })

        if (existing) {
            await prisma.auditLog.update({
                where: { id: existing.id },
                data: { changes: config }
            })
        } else {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: scheduleKey,
                    changes: config,
                    entityType: 'REPORT_SCHEDULE',
                    entityId: reportType
                }
            })
        }

        return NextResponse.json({ message: `${reportType} report scheduled ${frequency} to ${email}` })
    } catch (error) {
        console.error('[SCHEDULED_REPORT_POST]', error)
        return NextResponse.json({ error: 'Failed to schedule report' }, { status: 500 })
    }
}

// GET — List user's scheduled reports
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const schedules = await prisma.auditLog.findMany({
            where: {
                userId: user.id,
                action: { startsWith: 'REPORT_SCHEDULE_' }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            schedules: schedules.map(s => ({
                id: s.id,
                type: s.action.replace('REPORT_SCHEDULE_', ''),
                config: JSON.parse(s.changes || '{}'),
                createdAt: s.createdAt
            }))
        })
    } catch (error) {
        console.error('[SCHEDULED_REPORT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }
}
