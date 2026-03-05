// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Schedule a daily flash report email
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { email, reportType, frequency, time, enabled } = body as {
            email: string
            reportType: string // FLASH, WEEKLY_SUMMARY, INVENTORY_ALERTS
            frequency: string // DAILY, WEEKLY, MONTHLY
            time?: string // "07:00" (send time)
            enabled: boolean
        }

        if (!email || !reportType || !frequency) {
            return ApiResponse.badRequest('email, reportType, and frequency required')
        }

        // Store as notification preference
        const existing = await prisma.notification.findFirst({
            where: { userId: user.id, type: `SCHEDULED_${reportType}` }
        })

        if (existing) {
            await prisma.notification.update({
                where: { id: existing.id },
                data: {
                    title: `${reportType} (${frequency})`,
                    body: JSON.stringify({ email, reportType, frequency, time: time || '07:00', enabled }),
                    status: enabled ? 'ACTIVE' : 'DISABLED'
                }
            })
        } else {
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    type: `SCHEDULED_${reportType}`,
                    title: `${reportType} (${frequency})`,
                    body: JSON.stringify({ email, reportType, frequency, time: time || '07:00', enabled }),
                    status: enabled ? 'ACTIVE' : 'DISABLED'
                }
            })
        }

        return ApiResponse.success({ message: `${reportType} report scheduled ${frequency} to ${email}` })
    } catch (error) {
        console.error('[SCHEDULED_REPORT_POST]', error)
        return ApiResponse.error('Failed to schedule report')
    }
}

// GET — List scheduled reports for user
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any

        const scheduled = await prisma.notification.findMany({
            where: { userId: user.id, type: { startsWith: 'SCHEDULED_' } },
            orderBy: { createdAt: 'desc' }
        })

        return ApiResponse.success({
            schedules: scheduled.map(s => ({
                id: s.id,
                type: s.type.replace('SCHEDULED_', ''),
                config: JSON.parse(s.body || '{}'),
                status: s.status
            }))
        })
    } catch (error) {
        console.error('[SCHEDULED_REPORT_GET]', error)
        return ApiResponse.error('Failed to fetch schedules')
    }
}
