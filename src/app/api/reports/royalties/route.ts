/**
 * Royalties Report API
 *
 * GET — Royalty obligations from RoyaltyConfig + RoyaltyRecord + current revenue
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '90')
        const since = new Date(); since.setDate(since.getDate() - days)
        const franchiseId = user.franchiseId

        // Get franchise + franchisor info
        const franchise = await prisma.franchise.findUnique({
            where: { id: franchiseId },
            select: {
                name: true,
                franchisor: {
                    select: {
                        id: true,
                        name: true,
                        royaltyConfig: true
                    }
                }
            }
        })

        // Get royalty records
        const royaltyRecords = await prisma.royaltyRecord.findMany({
            where: { franchiseId, periodStart: { gte: since } },
            orderBy: { periodStart: 'desc' }
        })

        // Get current period revenue
        const currentMonthStart = new Date()
        currentMonthStart.setDate(1)
        currentMonthStart.setHours(0, 0, 0, 0)

        const currentRevenue = await prisma.transaction.aggregate({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: currentMonthStart }
            },
            _sum: { total: true }
        })

        const currentGross = Number(currentRevenue._sum?.total || 0)
        const royaltyPct = Number(franchise?.franchisor?.royaltyConfig?.percentage || 0)
        const estimatedRoyalty = currentGross * (royaltyPct / 100)

        return NextResponse.json({
            config: {
                royaltyPercentage: royaltyPct,
                minimumMonthlyFee: Number(franchise?.franchisor?.royaltyConfig?.minimumMonthlyFee || 0),
                calculationPeriod: franchise?.franchisor?.royaltyConfig?.calculationPeriod || 'MONTHLY',
                franchisorName: franchise?.franchisor?.name || 'N/A'
            },
            currentPeriod: {
                grossRevenue: Math.round(currentGross * 100) / 100,
                estimatedRoyalty: Math.round(estimatedRoyalty * 100) / 100,
                periodStart: currentMonthStart.toISOString()
            },
            history: royaltyRecords.map(r => ({
                id: r.id,
                periodStart: r.periodStart,
                periodEnd: r.periodEnd,
                grossRevenue: Number(r.grossRevenue),
                royaltyAmount: Number(r.royaltyAmount),
                status: r.status,
                paidAt: r.paidAt
            })),
            totalPaid: royaltyRecords
                .filter(r => r.status === 'PAID')
                .reduce((s, r) => s + Number(r.royaltyAmount), 0),
            totalOwed: royaltyRecords
                .filter(r => r.status === 'PENDING')
                .reduce((s, r) => s + Number(r.royaltyAmount), 0)
        })
    } catch (error) {
        console.error('[ROYALTIES_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate royalties report' }, { status: 500 })
    }
}
