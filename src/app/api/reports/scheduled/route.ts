/**
 * Scheduled Reports API
 *
 * POST — Save report schedule preferences (stored in user metadata)
 * GET  — List saved report schedules
 *
 * Note: Notification model doesn't exist. Using UserPreference pattern instead.
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Save a scheduled report preference
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, franchiseId: true }
        })

        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role || '')) {
            return ApiResponse.forbidden('Owner+ only')
        }

        const body = await request.json()
        const { email, reportType, frequency, time, enabled } = body as {
            email: string
            reportType: string
            frequency: string
            time?: string
            enabled: boolean
        }

        if (!email || !reportType || !frequency) {
            return ApiResponse.badRequest('email, reportType, and frequency required')
        }

        // Store schedule config as JSON in user's metadata
        // Using activityLog as a lightweight store since Notification model doesn't exist
        const scheduleKey = `REPORT_SCHEDULE_${reportType}`
        const config = JSON.stringify({ email, reportType, frequency, time: time || '07:00', enabled })

        // Check for existing schedule via activityLog
        const existing = await prisma.activityLog.findFirst({
            where: { userId: session.user.id, action: scheduleKey }
        })

        if (existing) {
            await prisma.activityLog.update({
                where: { id: existing.id },
                data: { details: config }
            })
        } else {
            await prisma.activityLog.create({
                data: {
                    userId: session.user.id,
                    action: scheduleKey,
                    details: config,
                    entityType: 'REPORT_SCHEDULE',
                    entityId: reportType
                }
            })
        }

        return ApiResponse.success({ message: `${reportType} report scheduled ${frequency} to ${email}` })
    } catch (error) {
        console.error('[SCHEDULED_REPORT_POST]', error)
        return ApiResponse.error('Failed to schedule report', 500)
    }
}

// GET — List user's scheduled reports
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const schedules = await prisma.activityLog.findMany({
            where: {
                userId: session.user.id,
                action: { startsWith: 'REPORT_SCHEDULE_' }
            },
            orderBy: { createdAt: 'desc' }
        })

        return ApiResponse.success({
            schedules: schedules.map(s => ({
                id: s.id,
                type: s.action.replace('REPORT_SCHEDULE_', ''),
                config: JSON.parse(s.details || '{}'),
                createdAt: s.createdAt
            }))
        })
    } catch (error) {
        console.error('[SCHEDULED_REPORT_GET]', error)
        return ApiResponse.error('Failed to fetch schedules', 500)
    }
}
