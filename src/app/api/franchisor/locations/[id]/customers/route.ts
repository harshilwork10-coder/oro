/**
 * Location Customers Tab API
 * 
 * Returns customer metrics for a location
 * - Unique customers (by clientId)
 * - New vs returning
 * - VIP list
 * - Inactive customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma'
import { canAccessLocation, UserRole } from '@/lib/reporting/scopeEnforcement';
import { getDateRange, DateRangePreset } from '@/lib/reporting/kpiDefinitions';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { id: locationId } = await params;

        const hasAccess = await canAccessLocation(user.id, user.role as UserRole, locationId, user.franchiseId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const rangePreset = (searchParams.get('range') || 'MTD') as DateRangePreset;
        const dateRange = getDateRange(rangePreset);

        // Get location's franchiseId (transactions linked by franchise, not location)
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        });
        const franchiseId = location?.franchiseId;
        if (!franchiseId) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Get unique clients in date range
        const txInRange = await prisma.transaction.findMany({
            where: {
                franchiseId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
                clientId: { not: null }
            },
            select: {
                clientId: true,
                createdAt: true,
                total: true
            }
        });

        const uniqueClientIds = [...new Set(txInRange.map(t => t.clientId).filter(Boolean))] as string[];

        // Identify new vs returning
        const returningData = await prisma.transaction.groupBy({
            by: ['clientId'],
            where: {
                franchiseId,
                clientId: { in: uniqueClientIds },
                createdAt: { lt: dateRange.from }
            },
            _count: true
        });

        const returningClientIds = new Set(returningData.map(c => c.clientId));
        const newClientIds = uniqueClientIds.filter(id => !returningClientIds.has(id));

        // Get VIP clients (top spenders)
        const clientSpending = await prisma.transaction.groupBy({
            by: ['clientId'],
            where: {
                franchiseId,
                clientId: { not: null },
                status: { not: 'VOIDED' }
            },
            _sum: { total: true },
            _count: true,
            orderBy: { _sum: { total: 'desc' } },
            take: 20
        });

        const vipClientIds = clientSpending.slice(0, 10).map(c => c.clientId).filter(Boolean) as string[];
        const vipDetails = await prisma.client.findMany({
            where: { id: { in: vipClientIds } },
            select: { id: true, firstName: true, lastName: true, phone: true, email: true }
        });

        const vipList = vipDetails.map(c => {
            const spending = clientSpending.find(s => s.clientId === c.id);
            return {
                ...c,
                totalSpent: Number(spending?._sum?.total || 0),
                visitCount: spending?._count || 0
            };
        });

        // Get inactive customers (no visit in 30/60/90 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);

        const allTxLastYear = await prisma.transaction.findMany({
            where: {
                franchiseId,
                createdAt: { gte: yearAgo },
                clientId: { not: null }
            },
            select: { clientId: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });

        // Group by last visit date
        const lastVisitMap = new Map<string, Date>();
        for (const tx of allTxLastYear) {
            if (tx.clientId && !lastVisitMap.has(tx.clientId)) {
                lastVisitMap.set(tx.clientId, tx.createdAt);
            }
        }

        let inactive30 = 0, inactive60 = 0, inactive90 = 0;
        for (const [, lastVisit] of lastVisitMap) {
            if (lastVisit < ninetyDaysAgo) inactive90++;
            else if (lastVisit < sixtyDaysAgo) inactive60++;
            else if (lastVisit < thirtyDaysAgo) inactive30++;
        }

        return NextResponse.json({
            dateRange: {
                preset: rangePreset,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString()
            },
            summary: {
                uniqueCustomers: uniqueClientIds.length,
                newCustomers: newClientIds.length,
                returningCustomers: returningClientIds.size,
                newVsReturningRatio: uniqueClientIds.length > 0
                    ? (newClientIds.length / uniqueClientIds.length * 100).toFixed(1) + '%'
                    : '0%'
            },
            vipList,
            inactive: {
                days30: inactive30,
                days60: inactive60,
                days90: inactive90,
                total: inactive30 + inactive60 + inactive90
            }
        });
    } catch (error) {
        console.error('[Location Customers] Error:', error);
        return NextResponse.json({ error: 'Failed to load customer data' }, { status: 500 });
    }
}
