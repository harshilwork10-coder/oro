/**
 * Location Customers Tab API
 * 
 * Returns customer metrics for a location
 * - Unique customers
 * - New vs returning
 * - VIP list
 * - Inactive customers
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

        // Get unique customers in date range
        const customersInRange = await prisma.transaction.findMany({
            where: {
                storeId: locationId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
                customerId: { not: null }
            },
            select: {
                customerId: true,
                createdAt: true,
                total: true
            }
        });

        const uniqueCustomerIds = [...new Set(customersInRange.map(t => t.customerId).filter(Boolean))];

        // Identify new vs returning
        const customersWithHistory = await prisma.transaction.groupBy({
            by: ['customerId'],
            where: {
                storeId: locationId,
                customerId: { in: uniqueCustomerIds as string[] },
                createdAt: { lt: dateRange.from }
            },
            _count: true
        });

        const returningCustomerIds = new Set(customersWithHistory.map(c => c.customerId));
        const newCustomerIds = uniqueCustomerIds.filter(id => !returningCustomerIds.has(id));

        // Get VIP customers (top spenders)
        const customerSpending = await prisma.transaction.groupBy({
            by: ['customerId'],
            where: {
                storeId: locationId,
                customerId: { not: null },
                status: { not: 'VOIDED' }
            },
            _sum: { total: true },
            _count: true,
            orderBy: { _sum: { total: 'desc' } },
            take: 20
        });

        const vipCustomerIds = customerSpending.slice(0, 10).map(c => c.customerId).filter(Boolean);
        const vipDetails = await prisma.customer.findMany({
            where: { id: { in: vipCustomerIds as string[] } },
            select: { id: true, firstName: true, lastName: true, phone: true, email: true }
        });

        const vipList = vipDetails.map(c => {
            const spending = customerSpending.find(s => s.customerId === c.id);
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

        // Recent customers (visited within 30 days)
        const recentCustomers = await prisma.transaction.findMany({
            where: {
                storeId: locationId,
                createdAt: { gte: thirtyDaysAgo },
                customerId: { not: null }
            },
            select: { customerId: true },
            distinct: ['customerId']
        });
        const recentIds = new Set(recentCustomers.map(c => c.customerId));

        // All customers who visited in past year
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);

        const allCustomers = await prisma.transaction.findMany({
            where: {
                storeId: locationId,
                createdAt: { gte: yearAgo },
                customerId: { not: null }
            },
            select: { customerId: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });

        // Group by last visit date
        const lastVisitMap = new Map<string, Date>();
        for (const tx of allCustomers) {
            if (tx.customerId && !lastVisitMap.has(tx.customerId)) {
                lastVisitMap.set(tx.customerId, tx.createdAt);
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
                uniqueCustomers: uniqueCustomerIds.length,
                newCustomers: newCustomerIds.length,
                returningCustomers: returningCustomerIds.size,
                newVsReturningRatio: uniqueCustomerIds.length > 0
                    ? (newCustomerIds.length / uniqueCustomerIds.length * 100).toFixed(1) + '%'
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
