/**
 * Scheduled Reports API
 *
 * POST — Save report schedule preferences (stored in auditLog as config records)
 * GET  — List saved report schedules
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

        // Store schedule config as JSON in auditLog
        const scheduleKey = `REPORT_SCHEDULE_${reportType}`
        const config = JSON.stringify({ email, reportType, frequency, time: time || '07:00', enabled })

        // Check for existing schedule
        const existing = await prisma.auditLog.findFirst({
            where: { userId: session.user.id, action: scheduleKey }
        })

        if (existing) {
            await prisma.auditLog.update({
                where: { id: existing.id },
                data: { changes: config }
            })
        } else {
            await prisma.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: scheduleKey,
                    changes: config,
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

        const schedules = await prisma.auditLog.findMany({
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
                config: JSON.parse(s.changes || '{}'),
                createdAt: s.createdAt
            }))
        })
    } catch (error) {
        console.error('[SCHEDULED_REPORT_GET]', error)
        return ApiResponse.error('Failed to fetch schedules', 500)
    }
}
