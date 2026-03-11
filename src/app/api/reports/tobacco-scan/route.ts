/**
 * Tobacco Scan Submissions Report API
 *
 * GET — Track tobacco scan data submissions to manufacturers (Altria, RJR, ITG)
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })
        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
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

        return ApiResponse.success({
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
        return ApiResponse.error('Failed to generate tobacco scan report', 500)
    }
}
