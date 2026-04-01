/**
 * Location Leaderboard API
 *
 * Ranks locations by various metrics across the brand network.
 * - FRANCHISOR role: all franchises under the brand (network-wide)
 * - OWNER role: their single franchise only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';
import { getDateRange, DateRangePreset } from '@/lib/reporting/kpiDefinitions';

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['FRANCHISOR', 'OWNER'].includes(authUser.role)) {
            return NextResponse.json({ error: 'Franchisor or Owner access required' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const rangePreset = (searchParams.get('range') || 'MTD') as DateRangePreset;
        const sortBy = searchParams.get('sortBy') || 'netSales';
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

        const dateRange = getDateRange(rangePreset);

        // Resolve franchise IDs based on role
        let franchiseIds: string[] = [];

        if (authUser.role === 'FRANCHISOR') {
            // FRANCHISOR owns a brand → aggregate across all franchises under that brand
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: authUser.id },
                include: { franchises: { select: { id: true } } }
            });
            if (!franchisor) {
                return NextResponse.json({
                    leaderboard: [],
                    totalLocations: 0,
                    dateRange: { preset: rangePreset, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
                    sortBy
                });
            }
            franchiseIds = franchisor.franchises.map(f => f.id);
        } else {
            // OWNER — single franchise
            const dbUser = await prisma.user.findUnique({
                where: { id: authUser.id },
                select: { franchiseId: true }
            });
            if (!dbUser?.franchiseId) {
                return NextResponse.json({ error: 'No franchise associated with this owner' }, { status: 400 });
            }
            franchiseIds = [dbUser.franchiseId];
        }

        if (franchiseIds.length === 0) {
            return NextResponse.json({
                leaderboard: [],
                totalLocations: 0,
                dateRange: { preset: rangePreset, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
                sortBy
            });
        }

        // Get all active locations across scoped franchises
        const locations = await prisma.location.findMany({
            where: { franchiseId: { in: franchiseIds }, provisioningStatus: 'ACTIVE' },
            select: { id: true, name: true, address: true }
        }) as Array<{ id: string; name: string; address: string }>;

        // Calculate metrics per location
        const leaderboard = await Promise.all(
            locations.map(async (loc) => {
                const [apptStats, staffCount] = await Promise.all([
                    (prisma.appointment as any).groupBy({
                        by: ['status'],
                        where: {
                            locationId: loc.id,
                            startTime: { gte: dateRange.from, lte: dateRange.to }
                        },
                        _count: true,
                        _sum: { price: true }
                    }).catch(() => []),
                    prisma.user.count({
                        where: {
                            locationId: loc.id,
                            role: { in: ['EMPLOYEE', 'MANAGER', 'STYLIST'] }
                        }
                    })
                ]);

                const apptByStatus = Object.fromEntries(
                    (apptStats as Array<{ status: string; _count: number; _sum: { price: number | null } }>)
                        .map(s => [s.status, { count: s._count, revenue: Number(s._sum?.price || 0) }])
                );

                const totalBooked = Object.values(apptByStatus).reduce((a, b) => a + b.count, 0);
                const completed = apptByStatus['COMPLETED']?.count || 0;
                const noShows = apptByStatus['NO_SHOW']?.count || 0;
                const revenue = Object.values(apptByStatus).reduce((a, b) => a + b.revenue, 0);

                const noShowRate = totalBooked > 0 ? (noShows / totalBooked) * 100 : 0;
                const avgTicket = completed > 0 ? revenue / completed : 0;

                return {
                    id: loc.id,
                    name: loc.name,
                    address: loc.address,
                    netSales: revenue,
                    transactionCount: completed,
                    avgTicket,
                    appointmentsBooked: totalBooked,
                    appointmentsCompleted: completed,
                    noShowRate,
                    staffCount
                };
            })
        );

        // Sort by requested metric
        leaderboard.sort((a, b) => {
            switch (sortBy) {
                case 'avgTicket':
                    return b.avgTicket - a.avgTicket;
                case 'noShowRate':
                    return a.noShowRate - b.noShowRate; // Lower is better
                case 'netSales':
                default:
                    return b.netSales - a.netSales;
            }
        });

        const rankedLeaderboard = leaderboard.slice(0, limit).map((loc, idx) => ({
            rank: idx + 1,
            ...loc
        }));

        return NextResponse.json({
            dateRange: {
                preset: rangePreset,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString()
            },
            sortBy,
            leaderboard: rankedLeaderboard,
            totalLocations: locations.length
        });
    } catch (error) {
        console.error('[Leaderboard] Error:', error);
        return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
    }
}
