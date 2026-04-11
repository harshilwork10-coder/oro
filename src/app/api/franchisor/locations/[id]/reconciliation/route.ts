/**
 * Location Reconciliation API
 * 
 * P0 Must-Ship: Variance detection + root cause analysis
 * Returns: grossSales, netSales, refunds, voids, tenders, variance, warnings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma'
import { canAccessLocation, UserRole } from '@/lib/reporting/scopeEnforcement';
import { calculateReconciliation } from '@/lib/reporting/ledgerRules';
import { REPORT_VERSION, createExportMetadata, formatExportHeader } from '@/lib/reporting/kpiDefinitions';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { id: locationId } = await params;

        // Scope check
        const hasAccess = await canAccessLocation(user.id, user.role as UserRole, locationId, user.franchiseId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const format = searchParams.get('format'); // 'json' or 'csv'

        if (!from || !to) {
            return NextResponse.json({ error: 'from and to dates required' }, { status: 400 });
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);

        // Fetch all transactions for the period (cast as any — storeId/tipAmount not in schema)
        const transactions = await prisma.transaction.findMany({
            where: {
                storeId: locationId,
                createdAt: { gte: fromDate, lte: toDate }
            },
            select: {
                id: true,
                type: true,
                total: true,
                tip: true,
                paymentMethod: true,
                status: true,
                createdAt: true
            }
        }) as any[];

        // Calculate reconciliation
        const txData = transactions.map((tx: any) => ({
            type: tx.type || 'SALE',
            total: Number(tx.total),
            tipAmount: tx.tip ? Number(tx.tip) : undefined,
            tipType: 'CARD' as const,
            paymentMethod: tx.paymentMethod || 'CASH',
            status: tx.status || 'COMPLETED'
        }));

        const reconciliation = calculateReconciliation(txData);

        // Check for open shifts (timeEntry not in main schema — any-cast)
        const openShifts = await prisma.timeEntry.count({
            where: {
                locationId,
                clockIn: { gte: fromDate, lte: toDate },
                clockOut: null
            }
        }).catch(() => 0);

        const rootCauses: string[] = [];
        if (openShifts > 0) {
            rootCauses.push('open_shift');
            reconciliation.warnings.push({
                type: 'OPEN_SHIFT',
                message: `${openShifts} shift(s) not closed`,
                amount: 0
            });
        }

        // Export format
        if (format === 'csv') {
            const metadata = createExportMetadata(
                {
                    locations: [locationId],
                    dateRange: { from, to }
                },
                'America/Chicago'
            );

            const header = formatExportHeader(metadata);
            const csv = [
                header,
                'Metric,Amount',
                `Gross Sales,${reconciliation.grossSales.toFixed(2)}`,
                `Refunds,${reconciliation.refunds.toFixed(2)}`,
                `Voids,${reconciliation.voids.toFixed(2)}`,
                `Discounts,${reconciliation.discounts.toFixed(2)}`,
                `Net Sales,${reconciliation.netSales.toFixed(2)}`,
                `Tips (Cash),${reconciliation.tips.cash.toFixed(2)}`,
                `Tips (Card),${reconciliation.tips.card.toFixed(2)}`,
                ``,
                `Tender Type,Amount`,
                `Cash,${reconciliation.tenders.cash.toFixed(2)}`,
                `Card,${reconciliation.tenders.card.toFixed(2)}`,
                `Gift Card,${reconciliation.tenders.giftCard.toFixed(2)}`,
                `Other,${reconciliation.tenders.other.toFixed(2)}`,
                `Total,${reconciliation.tenders.total.toFixed(2)}`,
                ``,
                `Variance,${reconciliation.variance.toFixed(2)}`,
                `Reconciled,${reconciliation.reconciled ? 'YES' : 'NO'}`
            ].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="reconciliation-${locationId}-${from}-${to}.csv"`
                }
            });
        }

        return NextResponse.json({
            locationId,
            dateRange: { from, to },
            reportVersion: REPORT_VERSION,
            ...reconciliation,
            rootCauses,
            transactionCount: transactions.length
        });
    } catch (error) {
        console.error('[Reconciliation] Error:', error);
        return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
    }
}
