/**
 * Location Leaderboard API
 * 
 * Ranks locations by various metrics
 * Used for HQ portfolio dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange, DateRangePreset } from '@/lib/reporting/kpiDefinitions';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { id: string; role: string; franchiseId?: string };

        const { searchParams } = new URL(request.url);
        const rangePreset = (searchParams.get('range') || 'MTD') as DateRangePreset;
        const sortBy = searchParams.get('sortBy') || 'netSales';
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

        const dateRange = getDateRange(rangePreset);
        const franchiseId = user.franchiseId;

        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 });
        }

        // Get locations for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId, provisioningStatus: 'ACTIVE' },
            select: { id: true, name: true, address: true }
        });

        // Calculate metrics per location based on appointments and time entries
        const leaderboard = await Promise.all(
            locations.map(async (loc) => {
                const [apptStats, staffCount] = await Promise.all([
                    // Appointments
                    prisma.appointment.groupBy({
                        by: ['status'],
                        where: {
                            locationId: loc.id,
                            startTime: { gte: dateRange.from, lte: dateRange.to }
                        },
                        _count: true,
                        _sum: { price: true }
                    }).catch(() => []),
                    // Staff count
                    prisma.user.count({
                        where: {
                            locationId: loc.id,
                            role: { in: ['EMPLOYEE', 'MANAGER', 'STYLIST'] }
                        }
                    })
                ]);

                // Parse appointment stats
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

        // Add rank
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
