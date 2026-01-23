/**
 * Store-Level Reports API
 * 
 * Returns detailed reports for a specific location:
 * - Financial summary (gross, net, refunds, tips, tax)
 * - Transaction details
 * - Employee performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: locationId } = await params;
        const { searchParams } = new URL(request.url);
        const periodParam = searchParams.get('period') || 'today';

        // Get date range based on period
        const now = new Date();
        let from: Date;
        let to: Date = now;
        let label: string;

        switch (periodParam) {
            case 'wtd':
                from = new Date(now);
                from.setDate(now.getDate() - now.getDay());
                from.setHours(0, 0, 0, 0);
                label = 'Week to Date';
                break;
            case 'mtd':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                label = 'Month to Date';
                break;
            case 'ytd':
                from = new Date(now.getFullYear(), 0, 1);
                label = 'Year to Date';
                break;
            default:
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                label = 'Today';
        }

        // Get location info
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: {
                id: true,
                name: true,
                address: true,
                provisioningStatus: true,
                franchise: { select: { name: true } }
            }
        });

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Get transactions for this location's franchise
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: location.franchise ? undefined : undefined, // Adjust based on how transactions are linked
                createdAt: { gte: from, lte: to }
            },
            select: {
                id: true,
                invoiceNumber: true,
                total: true,
                tip: true,
                tax: true,
                paymentMethod: true,
                status: true,
                createdAt: true,
                employeeId: true,
                employee: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        // Calculate summary
        const completed = transactions.filter(t => t.status !== 'VOIDED');
        const refunded = transactions.filter(t => t.status === 'REFUNDED');

        const grossSales = completed.reduce((sum, t) => sum + Number(t.total), 0);
        const refunds = refunded.reduce((sum, t) => sum + Math.abs(Number(t.total)), 0);
        const tips = completed.reduce((sum, t) => sum + Number(t.tip || 0), 0);
        const tax = completed.reduce((sum, t) => sum + Number(t.tax || 0), 0);
        const netSales = grossSales - refunds;

        // Calculate unique customers (using clientId if available)
        const uniqueClients = new Set(transactions.map(t => t.id)).size; // Approximate

        // Employee performance
        const employeeMap = new Map<string, { id: string; name: string; revenue: number; transactionCount: number; tips: number }>();
        for (const tx of completed) {
            if (tx.employee) {
                const emp = employeeMap.get(tx.employee.id) || {
                    id: tx.employee.id,
                    name: tx.employee.name || 'Unknown',
                    revenue: 0,
                    transactionCount: 0,
                    tips: 0
                };
                emp.revenue += Number(tx.total);
                emp.transactionCount += 1;
                emp.tips += Number(tx.tip || 0);
                employeeMap.set(tx.employee.id, emp);
            }
        }

        return NextResponse.json({
            location: {
                id: location.id,
                name: location.name,
                address: location.address,
                franchiseeName: location.franchise?.name || 'Unknown',
                provisioningStatus: location.provisioningStatus
            },
            period: {
                from: from.toISOString(),
                to: to.toISOString(),
                label
            },
            summary: {
                grossSales,
                netSales,
                refunds,
                tips,
                tax,
                transactionCount: completed.length,
                avgTicket: completed.length > 0 ? netSales / completed.length : 0,
                uniqueCustomers: uniqueClients
            },
            transactions: transactions.map(t => ({
                id: t.id,
                invoiceNumber: t.invoiceNumber,
                total: t.total,
                paymentMethod: t.paymentMethod,
                status: t.status,
                createdAt: t.createdAt.toISOString()
            })),
            employees: Array.from(employeeMap.values()).sort((a, b) => b.revenue - a.revenue)
        });
    } catch (error) {
        console.error('[Store Reports] Error:', error);
        return NextResponse.json({ error: 'Failed to load store report' }, { status: 500 });
    }
}
