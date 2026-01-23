/**
 * Location Staff Tab API
 * 
 * Returns staff performance metrics for a location
 * - Stylist leaderboard
 * - Utilization by stylist
 * - Tips breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessLocation, UserRole } from '@/lib/reporting/scopeEnforcement';
import { getDateRange, DateRangePreset } from '@/lib/reporting/kpiDefinitions';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { id: string; role: string; franchiseId?: string };
        const { id: locationId } = await params;

        const hasAccess = await canAccessLocation(user.id, user.role as UserRole, locationId, user.franchiseId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const rangePreset = (searchParams.get('range') || 'MTD') as DateRangePreset;
        const dateRange = getDateRange(rangePreset);

        // Get employees at this location
        const employees = await prisma.user.findMany({
            where: {
                OR: [
                    { locationId },
                    { memberships: { some: { locationId } } }
                ],
                role: { in: ['EMPLOYEE', 'MANAGER', 'STYLIST'] }
            },
            select: { id: true, name: true, role: true, image: true }
        });

        // Get transaction stats per employee
        const employeeStats = await Promise.all(
            employees.map(async (emp) => {
                const [txStats, tipStats, appointmentStats] = await Promise.all([
                    // Revenue
                    prisma.transaction.aggregate({
                        where: {
                            storeId: locationId,
                            employeeId: emp.id,
                            createdAt: { gte: dateRange.from, lte: dateRange.to },
                            status: { not: 'VOIDED' }
                        },
                        _sum: { total: true },
                        _count: true
                    }),
                    // Tips
                    prisma.transaction.aggregate({
                        where: {
                            storeId: locationId,
                            employeeId: emp.id,
                            createdAt: { gte: dateRange.from, lte: dateRange.to },
                            tipAmount: { gt: 0 }
                        },
                        _sum: { tipAmount: true }
                    }),
                    // Appointments (for salon)
                    prisma.appointment.groupBy({
                        by: ['status'],
                        where: {
                            locationId,
                            employeeId: emp.id,
                            startTime: { gte: dateRange.from, lte: dateRange.to }
                        },
                        _count: true
                    }).catch(() => [])
                ]);

                const apptByStatus = Object.fromEntries(
                    (appointmentStats as Array<{ status: string; _count: number }>).map(s => [s.status, s._count])
                );

                return {
                    id: emp.id,
                    name: emp.name,
                    role: emp.role,
                    image: emp.image,
                    revenue: Number(txStats._sum?.total || 0),
                    transactionCount: txStats._count || 0,
                    avgTicket: txStats._count ? Number(txStats._sum?.total || 0) / txStats._count : 0,
                    tips: Number(tipStats._sum?.tipAmount || 0),
                    appointments: {
                        booked: Object.values(apptByStatus).reduce((a, b) => a + b, 0),
                        completed: apptByStatus['COMPLETED'] || 0,
                        noShows: apptByStatus['NO_SHOW'] || 0
                    }
                };
            })
        );

        // Sort by revenue (leaderboard)
        const leaderboard = employeeStats.sort((a, b) => b.revenue - a.revenue);

        // Calculate team totals
        const teamTotals = {
            revenue: leaderboard.reduce((sum, e) => sum + e.revenue, 0),
            transactions: leaderboard.reduce((sum, e) => sum + e.transactionCount, 0),
            tips: leaderboard.reduce((sum, e) => sum + e.tips, 0),
            appointments: leaderboard.reduce((sum, e) => sum + e.appointments.booked, 0)
        };

        return NextResponse.json({
            dateRange: {
                preset: rangePreset,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString()
            },
            leaderboard,
            teamTotals,
            staffCount: employees.length
        });
    } catch (error) {
        console.error('[Location Staff] Error:', error);
        return NextResponse.json({ error: 'Failed to load staff data' }, { status: 500 });
    }
}
