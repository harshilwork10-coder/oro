/**
 * Location Transactions Tab API (Immutable Ledger)
 * 
 * Returns paginated transaction ledger with filters
 * Supports CSV/PDF export with legal metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessLocation, UserRole } from '@/lib/reporting/scopeEnforcement';
import { createExportMetadata, formatExportHeader } from '@/lib/reporting/kpiDefinitions';

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
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const type = searchParams.get('type'); // SALE, REFUND, VOID
        const paymentMethod = searchParams.get('paymentMethod');
        const employeeId = searchParams.get('employeeId');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 200);
        const format = searchParams.get('format'); // json, csv

        const where: Record<string, unknown> = {
            storeId: locationId,
            ...(from && to && { createdAt: { gte: new Date(from), lte: new Date(to) } }),
            ...(type && { type: { in: type.split(',') } }),
            ...(paymentMethod && { paymentMethod: { in: paymentMethod.split(',') } }),
            ...(employeeId && { employeeId })
        };

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    employee: { select: { id: true, name: true } },
                    customer: { select: { id: true, firstName: true, lastName: true } },
                    lineItems: {
                        select: { id: true, name: true, quantity: true, price: true, total: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            prisma.transaction.count({ where })
        ]);

        // CSV Export
        if (format === 'csv') {
            const metadata = createExportMetadata(
                { locations: [locationId], dateRange: { from: from || '', to: to || '' } },
                'America/Chicago'
            );

            const header = formatExportHeader(metadata);
            const csvRows = transactions.map(tx => [
                tx.id,
                tx.invoiceNumber || '',
                tx.createdAt.toISOString(),
                tx.type || 'SALE',
                tx.status || '',
                Number(tx.total).toFixed(2),
                Number(tx.tipAmount || 0).toFixed(2),
                tx.paymentMethod || '',
                tx.employee?.name || '',
                tx.customer ? `${tx.customer.firstName} ${tx.customer.lastName}` : '',
                tx.originalTransactionId || ''
            ].join(','));

            const csv = [
                header,
                'ID,Invoice,Date,Type,Status,Total,Tip,Payment,Employee,Customer,LinkedTo',
                ...csvRows
            ].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="transactions-${locationId}.csv"`
                }
            });
        }

        return NextResponse.json({
            transactions: transactions.map(tx => ({
                id: tx.id,
                invoiceNumber: tx.invoiceNumber,
                createdAt: tx.createdAt,
                type: tx.type || 'SALE',
                status: tx.status,
                total: Number(tx.total),
                subtotal: Number(tx.subtotal || 0),
                tax: Number(tx.tax || 0),
                tipAmount: Number(tx.tipAmount || 0),
                paymentMethod: tx.paymentMethod,
                employee: tx.employee,
                customer: tx.customer,
                lineItems: tx.lineItems,
                originalTransactionId: tx.originalTransactionId
            })),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (error) {
        console.error('[Location Transactions] Error:', error);
        return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
    }
}
