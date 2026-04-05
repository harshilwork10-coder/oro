/**
 * Tobacco Scan Report API
 *
 * GET — Track tobacco scan deal submissions (export batches) to manufacturers.
 * Uses TobaccoScanExportBatch as source of truth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '90')
        const manufacturer = searchParams.get('manufacturer')
        const status = searchParams.get('status')
        const since = new Date()
        since.setDate(since.getDate() - days)

        const where: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            createdAt: { gte: since }
        }
        if (manufacturer) where.manufacturer = manufacturer
        if (status) where.status = status

        const batches = await prisma.tobaccoScanExportBatch.findMany({
            where,
            include: {
                _count: { select: { events: true } },
            },
            orderBy: { weekStart: 'desc' }
        })

        const results = batches.map(b => ({
            id: b.id,
            manufacturer: b.manufacturer,
            weekStart: b.weekStart,
            weekEnd: b.weekEnd,
            recordCount: b.eventCount,
            totalDiscount: Number(b.totalDiscount),
            totalReimbursement: Number(b.totalReimbursement),
            status: b.status,
            submittedAt: b.submittedAt,
            paidAt: b.paidAt,
            paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
            exportFileName: b.exportFileName,
            exportFormat: b.exportFormat,
        }))

        // Summary by manufacturer
        const byManufacturer: Record<string, { count: number; paid: number; pending: number; totalReimbursement: number }> = {}
        for (const r of results) {
            if (!byManufacturer[r.manufacturer]) {
                byManufacturer[r.manufacturer] = { count: 0, paid: 0, pending: 0, totalReimbursement: 0 }
            }
            byManufacturer[r.manufacturer].count++
            if (r.status === 'PAID') byManufacturer[r.manufacturer].paid++
            if (r.status === 'GENERATED' || r.status === 'SUBMITTED') byManufacturer[r.manufacturer].pending++
            byManufacturer[r.manufacturer].totalReimbursement += r.totalReimbursement
        }

        // Round totals
        for (const key of Object.keys(byManufacturer)) {
            byManufacturer[key].totalReimbursement = Math.round(byManufacturer[key].totalReimbursement * 100) / 100
        }

        return NextResponse.json({
            batches: results,
            summary: {
                total: results.length,
                byManufacturer,
                generated: results.filter(r => r.status === 'GENERATED').length,
                submitted: results.filter(r => r.status === 'SUBMITTED').length,
                paid: results.filter(r => r.status === 'PAID').length,
                rejected: results.filter(r => r.status === 'REJECTED').length,
            },
            periodDays: days,
        })
    } catch (error) {
        console.error('[TOBACCO_SCAN_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate tobacco scan report' }, { status: 500 })
    }
}
