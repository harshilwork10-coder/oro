/**
 * HQ Portfolio KPIs API
 * 
 * SCOPE ENFORCEMENT:
 * - FRANCHISOR role: User owns a Franchisor → sees all Franchises under that brand
 * - OWNER role: User has franchiseId → sees only that franchise
 * - PROVIDER role: Should NOT access this endpoint (they use /provider/reports)
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

        // PROVIDER should use /provider/reports, not franchisor endpoints
        if (user.role === 'PROVIDER') {
            return NextResponse.json({ error: 'Use /api/provider/reports for platform admin access' }, { status: 403 });
        }

        // Must be FRANCHISOR or OWNER
        if (!['FRANCHISOR', 'OWNER'].includes(user.role)) {
            return NextResponse.json({ error: 'Franchisor or Owner access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const rangePreset = (searchParams.get('range') || 'TODAY') as DateRangePreset;
        const dateRange = getDateRange(rangePreset);

        // Get scope based on role
        let franchiseIds: string[] = [];

        if (user.role === 'FRANCHISOR') {
            // FRANCHISOR owns a Franchisor (brand) → get all franchises under it
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: user.id },
                include: {
                    franchises: { select: { id: true } }
                }
            });

            if (!franchisor) {
                return NextResponse.json({
                    error: 'No brand found for this user',
                    dateRange: { preset: rangePreset, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
                    locations: { total: 0, active: 0 },
                    kpis: { grossSales: 0, netSales: 0, refunds: 0, refundCount: 0, tips: 0, tax: 0, transactionCount: 0, avgTicket: 0 }
                });
            }

            franchiseIds = franchisor.franchises.map(f => f.id);
        } else if (user.role === 'OWNER') {
            // OWNER has direct franchiseId
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { franchiseId: true }
            });

            if (!dbUser?.franchiseId) {
                return NextResponse.json({
                    error: 'No franchise assigned to this owner',
                    dateRange: { preset: rangePreset, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
                    locations: { total: 0, active: 0 },
                    kpis: { grossSales: 0, netSales: 0, refunds: 0, refundCount: 0, tips: 0, tax: 0, transactionCount: 0, avgTicket: 0 }
                });
            }

            franchiseIds = [dbUser.franchiseId];
        }

        if (franchiseIds.length === 0) {
            return NextResponse.json({
                dateRange: { preset: rangePreset, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
                locations: { total: 0, active: 0 },
                kpis: { grossSales: 0, netSales: 0, refunds: 0, refundCount: 0, tips: 0, tax: 0, transactionCount: 0, avgTicket: 0 }
            });
        }

        // Get location counts
        const [locationCount, activeLocationCount] = await Promise.all([
            prisma.location.count({ where: { franchiseId: { in: franchiseIds } } }),
            prisma.location.count({ where: { franchiseId: { in: franchiseIds }, provisioningStatus: 'ACTIVE' } })
        ]);

        // Aggregate transactions
        const transactionFilter = {
            franchiseId: { in: franchiseIds },
            createdAt: { gte: dateRange.from, lte: dateRange.to },
            status: { not: 'VOIDED' }
        };

        const [transactionStats, refundStats] = await Promise.all([
            prisma.transaction.aggregate({
                where: transactionFilter,
                _sum: { total: true, tip: true, tax: true },
                _count: true
            }),
            prisma.transaction.aggregate({
                where: { ...transactionFilter, status: 'REFUNDED' },
                _sum: { total: true },
                _count: true
            })
        ]);

        const grossSales = Number(transactionStats._sum?.total || 0);
        const refunds = Math.abs(Number(refundStats._sum?.total || 0));
        const netSales = grossSales - refunds;

        return NextResponse.json({
            dateRange: {
                preset: rangePreset,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString()
            },
            locations: {
                total: locationCount,
                active: activeLocationCount
            },
            kpis: {
                grossSales,
                netSales,
                refunds,
                refundCount: refundStats._count || 0,
                tips: Number(transactionStats._sum?.tip || 0),
                tax: Number(transactionStats._sum?.tax || 0),
                transactionCount: transactionStats._count || 0,
                avgTicket: transactionStats._count ? netSales / transactionStats._count : 0
            }
        });
    } catch (error) {
        console.error('[HQ Portfolio KPIs] Error:', error);
        return NextResponse.json({ error: 'Failed to load portfolio KPIs' }, { status: 500 });
    }
}
