/**
 * Compare API — /api/franchisor/compare
 *
 * GET ?mode=location&a=<locationId>&b=<locationId>&range=THIS_MONTH
 * GET ?mode=region&a=<regionName>&b=<regionName>&range=THIS_MONTH
 *
 * Returns metrics for two entities side-by-side:
 *   grossSales, netSales, transactionCount, avgTicket,
 *   tips, refunds, refundRate, appointments, noShows, noShowRate
 *
 * Security: Franchisor-scoped — only franchises under caller's brand.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';

type DateRange = { from: Date; to: Date };

function getRange(preset: string): DateRange {
    const now = new Date();
    switch (preset) {
        case 'TODAY': {
            const from = new Date(now); from.setHours(0, 0, 0, 0);
            const to = new Date(now); to.setHours(23, 59, 59, 999);
            return { from, to };
        }
        case 'THIS_WEEK': {
            const from = new Date(now); from.setDate(now.getDate() - now.getDay()); from.setHours(0, 0, 0, 0);
            return { from, to: now };
        }
        case 'LAST_30': {
            const from = new Date(now); from.setDate(now.getDate() - 30);
            return { from, to: now };
        }
        case 'THIS_MONTH':
        default: {
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            return { from, to };
        }
    }
}

/** Returns all franchise { id, region } records scoped to the caller's HQ */
async function getScopedFranchises(userId: string) {
    // Primary owner path
    const ownedFranchisor = await prisma.franchisor.findFirst({
        where: { ownerId: userId },
        select: { id: true }
    });
    const franchisorId = ownedFranchisor?.id ?? null;

    if (!franchisorId) {
        // Membership path
        const mem = await prisma.franchisorMembership.findFirst({
            where: { userId },
            select: { franchisorId: true }
        });
        if (!mem) return null;
        return prisma.franchise.findMany({
            where: { franchisorId: mem.franchisorId },
            select: { id: true, region: true }
        });
    }

    return prisma.franchise.findMany({
        where: { franchisorId },
        select: { id: true, region: true }
    });
}

async function getMetricsForFranchiseIds(franchiseIds: string[], locationIds: string[] | null, dr: DateRange) {
    if (!franchiseIds.length) {
        return { grossSales: 0, netSales: 0, transactionCount: 0, avgTicket: 0, tips: 0, tax: 0, refunds: 0, refundCount: 0, refundRate: 0, appointments: 0, noShows: 0, noShowRate: 0 };
    }

    const txWhere = {
        franchiseId: { in: franchiseIds },
        ...(locationIds ? { locationId: { in: locationIds } } : {}),
        createdAt: { gte: dr.from, lte: dr.to },
        status: { not: 'VOIDED' as const }
    };

    const [txAgg, refundAgg] = await Promise.all([
        prisma.transaction.aggregate({
            where: txWhere,
            _sum: { total: true, tip: true, tax: true },
            _count: true
        }),
        prisma.transaction.aggregate({
            where: { ...txWhere, status: 'REFUNDED' },
            _sum: { total: true },
            _count: true
        }),
    ]);

    // Appointments only when we have specific locations
    let totalAppts = 0;
    let noShows = 0;
    if (locationIds && locationIds.length > 0) {
        const apptData = await prisma.appointment.groupBy({
            by: ['status'],
            where: {
                locationId: { in: locationIds },
                startTime: { gte: dr.from, lte: dr.to }
            },
            _count: { _all: true }
        });
        totalAppts = apptData.reduce((s, a) => s + a._count._all, 0);
        noShows = apptData.find(a => a.status === 'NO_SHOW')?._count._all ?? 0;
    }

    const gross = Number(txAgg._sum?.total || 0);
    const refunds = Math.abs(Number(refundAgg._sum?.total || 0));
    const txCount = txAgg._count || 0;
    const refundCount = refundAgg._count || 0;

    return {
        grossSales: Math.round(gross * 100) / 100,
        netSales: Math.round((gross - refunds) * 100) / 100,
        transactionCount: txCount,
        avgTicket: txCount > 0 ? Math.round((gross / txCount) * 100) / 100 : 0,
        tips: Math.round(Number(txAgg._sum?.tip || 0) * 100) / 100,
        tax: Math.round(Number(txAgg._sum?.tax || 0) * 100) / 100,
        refunds: Math.round(refunds * 100) / 100,
        refundCount,
        refundRate: txCount > 0 ? Math.round((refundCount / txCount) * 10000) / 100 : 0,
        appointments: totalAppts,
        noShows,
        noShowRate: totalAppts > 0 ? Math.round((noShows / totalAppts) * 10000) / 100 : 0,
    };
}

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scopedFranchises = await getScopedFranchises(authUser.id);
        if (!scopedFranchises) return NextResponse.json({ error: 'No HQ context' }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'location';
        const a = searchParams.get('a') || '';
        const b = searchParams.get('b') || '';
        const rangeName = searchParams.get('range') || 'THIS_MONTH';
        const dr = getRange(rangeName);

        const allFranchiseIds = scopedFranchises.map(f => f.id);

        if (mode === 'region') {
            const getRegionIds = (region: string) =>
                scopedFranchises.filter(f => f.region === region).map(f => f.id);

            const [idsA, idsB] = [getRegionIds(a), getRegionIds(b)];

            const [locsA, locsB, metricsA, metricsB] = await Promise.all([
                prisma.location.count({ where: { franchiseId: { in: idsA } } }),
                prisma.location.count({ where: { franchiseId: { in: idsB } } }),
                getMetricsForFranchiseIds(idsA, null, dr),
                getMetricsForFranchiseIds(idsB, null, dr),
            ]);

            return NextResponse.json({
                mode: 'region',
                period: rangeName,
                a: { label: a || '(Unassigned)', locationCount: locsA, franchiseeCount: idsA.length, metrics: metricsA },
                b: { label: b || '(Unassigned)', locationCount: locsB, franchiseeCount: idsB.length, metrics: metricsB },
            });
        }

        // Location mode — look up each location separately
        const [locA, locB] = await Promise.all([
            prisma.location.findFirst({
                where: { id: a, franchiseId: { in: allFranchiseIds } },
                select: { id: true, name: true, address: true, franchiseId: true }
            }),
            prisma.location.findFirst({
                where: { id: b, franchiseId: { in: allFranchiseIds } },
                select: { id: true, name: true, address: true, franchiseId: true }
            }),
        ]);

        if (!locA || !locB) {
            return NextResponse.json({ error: 'One or both locations not found in your HQ scope' }, { status: 404 });
        }

        // Get franchise metadata (name, region) separately
        const [frA, frB, metricsA, metricsB] = await Promise.all([
            prisma.franchise.findUnique({ where: { id: locA.franchiseId }, select: { name: true, region: true } }),
            prisma.franchise.findUnique({ where: { id: locB.franchiseId }, select: { name: true, region: true } }),
            getMetricsForFranchiseIds([locA.franchiseId], [a], dr),
            getMetricsForFranchiseIds([locB.franchiseId], [b], dr),
        ]);

        return NextResponse.json({
            mode: 'location',
            period: rangeName,
            a: {
                label: locA.name,
                address: locA.address,
                franchiseeName: frA?.name ?? null,
                region: frA?.region ?? null,
                metrics: metricsA
            },
            b: {
                label: locB.name,
                address: locB.address,
                franchiseeName: frB?.name ?? null,
                region: frB?.region ?? null,
                metrics: metricsB
            },
        });
    } catch (error) {
        console.error('[Compare API]', error);
        return NextResponse.json({ error: 'Failed to compare' }, { status: 500 });
    }
}
