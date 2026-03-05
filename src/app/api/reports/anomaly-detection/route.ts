// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Anomaly detection: flag unusual cashier behavior
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Manager+ only')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '7')
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get per-employee stats
        const employees = await prisma.user.findMany({
            where: { locationId, isActive: true },
            select: { id: true, name: true, role: true }
        })

        const anomalies = []

        for (const emp of employees) {
            const [completed, voided, refunded, noSales] = await Promise.all([
                prisma.transaction.count({ where: { employeeId: emp.id, status: 'COMPLETED', createdAt: { gte: since } } }),
                prisma.transaction.count({ where: { employeeId: emp.id, status: 'VOIDED', createdAt: { gte: since } } }),
                prisma.transaction.count({ where: { employeeId: emp.id, status: 'REFUNDED', createdAt: { gte: since } } }),
                (prisma as any).drawerActivity.count({ where: { userId: emp.id, type: 'NO_SALE', timestamp: { gte: since } } }).catch(() => 0)
            ])

            const voidRate = completed > 0 ? (voided / completed) * 100 : 0
            const refundRate = completed > 0 ? (refunded / completed) * 100 : 0
            const noSaleRate = completed > 0 ? (noSales / completed) * 100 : 0

            const flags = []
            if (voidRate > 10) flags.push({ type: 'HIGH_VOID_RATE', detail: `${voidRate.toFixed(1)}% void rate (${voided}/${completed})`, severity: voidRate > 20 ? 'CRITICAL' : 'WARNING' })
            if (refundRate > 8) flags.push({ type: 'HIGH_REFUND_RATE', detail: `${refundRate.toFixed(1)}% refund rate (${refunded}/${completed})`, severity: refundRate > 15 ? 'CRITICAL' : 'WARNING' })
            if (noSales > 5) flags.push({ type: 'EXCESS_NO_SALE', detail: `${noSales} no-sale drawer opens`, severity: noSales > 10 ? 'CRITICAL' : 'WARNING' })
            if (completed === 0 && (voided > 0 || refunded > 0)) flags.push({ type: 'VOID_NO_SALES', detail: `${voided + refunded} voids/refunds with 0 completed sales`, severity: 'CRITICAL' })

            if (flags.length > 0) {
                anomalies.push({
                    employeeId: emp.id,
                    employeeName: emp.name || 'Unknown',
                    role: emp.role,
                    stats: { completed, voided, refunded, noSales, voidRate: Math.round(voidRate * 10) / 10, refundRate: Math.round(refundRate * 10) / 10 },
                    flags
                })
            }
        }

        anomalies.sort((a, b) => b.flags.length - a.flags.length)

        return ApiResponse.success({
            anomalies,
            periodDays: days,
            summary: {
                employeesScanned: employees.length,
                flagged: anomalies.length,
                critical: anomalies.filter(a => a.flags.some(f => f.severity === 'CRITICAL')).length
            }
        })
    } catch (error) {
        console.error('[ANOMALY_GET]', error)
        return ApiResponse.error('Failed to detect anomalies')
    }
}
