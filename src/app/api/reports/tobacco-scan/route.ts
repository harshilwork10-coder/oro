/**
 * Tobacco Scan Submissions Report API
 *
 * GET — Track tobacco scan data submissions to manufacturers (Altria, RJR, ITG)
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '90')
        const manufacturer = searchParams.get('manufacturer')
        const status = searchParams.get('status')
        const since = new Date(); since.setDate(since.getDate() - days)

        const where: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            createdAt: { gte: since }
        }
        if (manufacturer) where.manufacturer = manufacturer
        if (status) where.status = status

        const submissions = await prisma.tobaccoScanSubmission.findMany({
            where,
            include: { location: { select: { name: true } } },
            orderBy: { weekStartDate: 'desc' }
        })

        const results = submissions.map(s => ({
            id: s.id,
            manufacturer: s.manufacturer,
            location: s.location?.name || 'Unknown',
            weekStart: s.weekStartDate,
            weekEnd: s.weekEndDate,
            recordCount: s.recordCount,
            totalAmount: s.totalAmount ? Math.round(Number(s.totalAmount) * 100) / 100 : null,
            status: s.status,
            submittedAt: s.submittedAt,
            confirmedAt: s.confirmedAt,
            notes: s.notes
        }))

        // Summary by manufacturer
        const byManufacturer: Record<string, { count: number; confirmed: number; pending: number; totalAmount: number }> = {}
        for (const s of results) {
            if (!byManufacturer[s.manufacturer]) byManufacturer[s.manufacturer] = { count: 0, confirmed: 0, pending: 0, totalAmount: 0 }
            byManufacturer[s.manufacturer].count++
            if (s.status === 'CONFIRMED') byManufacturer[s.manufacturer].confirmed++
            if (s.status === 'PENDING') byManufacturer[s.manufacturer].pending++
            byManufacturer[s.manufacturer].totalAmount += s.totalAmount || 0
        }

        // Round
        for (const key of Object.keys(byManufacturer)) {
            byManufacturer[key].totalAmount = Math.round(byManufacturer[key].totalAmount * 100) / 100
        }

        return NextResponse.json({
            submissions: results,
            summary: {
                total: results.length,
                byManufacturer,
                pending: results.filter(s => s.status === 'PENDING').length,
                confirmed: results.filter(s => s.status === 'CONFIRMED').length,
                rejected: results.filter(s => s.status === 'REJECTED').length
            },
            periodDays: days
        })
    } catch (error) {
        console.error('[TOBACCO_SCAN_GET]', error)
        return NextResponse.json({ error: 'Failed to generate tobacco scan report' }, { status: 500 })
    }
}
