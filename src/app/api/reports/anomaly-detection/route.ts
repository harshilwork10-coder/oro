/**
 * Anomaly Detection API
 *
 * GET — Flag unusual cashier behavior: high void/refund rates, excess no-sales
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role || '')) {
            return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '7')
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get employees for this franchise
        const employees = await prisma.user.findMany({
            where: { franchiseId: user.franchiseId, isActive: true },
            select: { id: true, firstName: true, lastName: true, role: true }
        })

        const anomalies: {
            employeeId: string; employeeName: string; role: string | null;
            stats: { completed: number; voided: number; refunded: number; noSales: number; voidRate: number; refundRate: number };
            flags: { type: string; detail: string; severity: string }[]
        }[] = []

        for (const emp of employees) {
            const [completed, voided, refunded, noSales] = await Promise.all([
                prisma.transaction.count({ where: { employeeId: emp.id, status: 'COMPLETED', createdAt: { gte: since } } }),
                prisma.transaction.count({ where: { employeeId: emp.id, status: 'VOIDED', createdAt: { gte: since } } }),
                prisma.transaction.count({ where: { employeeId: emp.id, status: 'REFUNDED', createdAt: { gte: since } } }),
                prisma.drawerActivity.count({ where: { employeeId: emp.id, type: 'NO_SALE', timestamp: { gte: since } } }).catch(() => 0)
            ])

            const voidRate = completed > 0 ? (voided / completed) * 100 : 0
            const refundRate = completed > 0 ? (refunded / completed) * 100 : 0

            const flags: { type: string; detail: string; severity: string }[] = []
            if (voidRate > 10) flags.push({ type: 'HIGH_VOID_RATE', detail: `${voidRate.toFixed(1)}% void rate (${voided}/${completed})`, severity: voidRate > 20 ? 'CRITICAL' : 'WARNING' })
            if (refundRate > 8) flags.push({ type: 'HIGH_REFUND_RATE', detail: `${refundRate.toFixed(1)}% refund rate (${refunded}/${completed})`, severity: refundRate > 15 ? 'CRITICAL' : 'WARNING' })
            if (noSales > 5) flags.push({ type: 'EXCESS_NO_SALE', detail: `${noSales} no-sale drawer opens`, severity: noSales > 10 ? 'CRITICAL' : 'WARNING' })
            if (completed === 0 && (voided > 0 || refunded > 0)) flags.push({ type: 'VOID_NO_SALES', detail: `${voided + refunded} voids/refunds with 0 completed sales`, severity: 'CRITICAL' })

            if (flags.length > 0) {
                anomalies.push({
                    employeeId: emp.id,
                    employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                    role: emp.role,
                    stats: { completed, voided, refunded, noSales, voidRate: Math.round(voidRate * 10) / 10, refundRate: Math.round(refundRate * 10) / 10 },
                    flags
                })
            }
        }

        anomalies.sort((a, b) => b.flags.length - a.flags.length)

        return NextResponse.json({
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
        return NextResponse.json({ error: 'Failed to detect anomalies' }, { status: 500 })
    }
}
