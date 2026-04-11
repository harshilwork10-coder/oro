/**
 * Sales Tab API
 * 
 * Returns sales breakdown for Location 360:
 * - By category/service
 * - Average ticket
 * - Tips breakdown
 * - Payment method split
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma'
import { getDateRange, DateRangePreset } from '@/lib/reporting/kpiDefinitions';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        ;
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: locationId } = await params;
        const { searchParams } = new URL(request.url);
        const rangePreset = (searchParams.get('range') || 'TODAY') as DateRangePreset;
        const dateRange = getDateRange(rangePreset);

        // Get location's franchise (cast as any — Location.franchiseId not in schema)
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { id: true, name: true, franchiseId: true }
        }) as any;

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Get transactions (cast as any[] — Service.category and Transaction.lineItems may differ from schema)
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: location.franchiseId!,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
                status: { not: 'VOIDED' }
            },
            include: {
                lineItems: {
                    include: {
                        product: { select: { id: true, name: true, category: true } },
                        service: { select: { id: true, name: true, categoryId: true } }
                    }
                }
            }
        }) as any[];

        // Calculate totals
        const grossSales = transactions.reduce((sum, t) => sum + Number(t.total), 0);
        const tips = transactions.reduce((sum, t) => sum + Number(t.tip || 0), 0);
        const tax = transactions.reduce((sum, t) => sum + Number(t.tax || 0), 0);
        const refunds = transactions.filter(t => t.status === 'REFUNDED').reduce((sum, t) => sum + Number(t.total), 0);
        const netSales = grossSales - refunds;

        // Payment method breakdown
        const paymentBreakdown: Record<string, { count: number; total: number }> = {};
        transactions.forEach(t => {
            const method = t.paymentMethod || 'OTHER';
            if (!paymentBreakdown[method]) {
                paymentBreakdown[method] = { count: 0, total: 0 };
            }
            paymentBreakdown[method].count++;
            paymentBreakdown[method].total += Number(t.total);
        });

        // Category breakdown from items
        const categoryBreakdown: Record<string, { count: number; revenue: number }> = {};
        transactions.forEach(t => {
            t.lineItems?.forEach((item: { product?: { category?: string } | null; service?: { category?: string } | null; quantity: number; price: unknown }) => {
                const category = item.product?.category || item.service?.category || 'Uncategorized';
                if (!categoryBreakdown[category]) {
                    categoryBreakdown[category] = { count: 0, revenue: 0 };
                }
                categoryBreakdown[category].count += item.quantity;
                categoryBreakdown[category].revenue += Number(item.price) * item.quantity;
            });
        });

        return NextResponse.json({
            locationId,
            dateRange: {
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
                preset: rangePreset
            },
            summary: {
                grossSales,
                netSales,
                refunds,
                tips,
                tax,
                transactionCount: transactions.length,
                avgTicket: transactions.length > 0 ? netSales / transactions.length : 0
            },
            breakdown: {
                byPaymentMethod: Object.entries(paymentBreakdown).map(([method, data]) => ({
                    method,
                    ...data,
                    percentage: grossSales > 0 ? (data.total / grossSales) * 100 : 0
                })),
                byCategory: Object.entries(categoryBreakdown).map(([category, data]) => ({
                    category,
                    ...data,
                    percentage: grossSales > 0 ? (data.revenue / grossSales) * 100 : 0
                })).sort((a, b) => b.revenue - a.revenue)
            }
        });
    } catch (error) {
        console.error('[Sales API] Error:', error);
        return NextResponse.json({ error: 'Failed to load sales data' }, { status: 500 });
    }
}
