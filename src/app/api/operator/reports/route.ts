/**
 * Operator Reports API
 * 
 * Returns dashboard data SCOPED to the operator's locations only.
 * Unlike franchisor APIs, this enforces membership-based filtering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { id: string; role: string; franchiseId?: string };
        const { searchParams } = new URL(request.url);
        const periodParam = searchParams.get('period') || 'today';

        // Get date range
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
            default:
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                label = 'Today';
        }

        // Get operator's locations based on their role and membership
        let locationFilter: { id?: { in: string[] }; franchiseId?: string } = {};

        // Get user from database to get franchiseId
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { franchiseId: true, role: true }
        });

        if (dbUser?.franchiseId) {
            locationFilter = { franchiseId: dbUser.franchiseId };
        } else {
            // No franchise linked - return empty
            return NextResponse.json({
                period: { from: from.toISOString(), to: to.toISOString(), label },
                summary: { totalLocations: 0, grossSales: 0, netSales: 0, tips: 0, transactionCount: 0, avgTicket: 0 },
                locations: [],
                alerts: []
            });
        }

        // Get operator's locations
        const locations = await prisma.location.findMany({
            where: locationFilter,
            select: { id: true, name: true, address: true, franchiseId: true }
        });

        // Aggregate data per location
        const locationKPIs = await Promise.all(locations.map(async (loc) => {
            // Transactions for this location's franchise
            const transactions = await prisma.transaction.findMany({
                where: {
                    franchiseId: loc.franchiseId!,
                    createdAt: { gte: from, lte: to },
                    status: { not: 'VOIDED' }
                },
                select: { total: true, tip: true, status: true }
            });

            const grossSales = transactions.reduce((sum, t) => sum + Number(t.total), 0);
            const refunds = transactions.filter(t => t.status === 'REFUNDED').reduce((sum, t) => sum + Number(t.total), 0);
            const netSales = grossSales - refunds;
            const tips = transactions.reduce((sum, t) => sum + Number(t.tip || 0), 0);

            // Appointments
            const appointments = await prisma.appointment.findMany({
                where: {
                    locationId: loc.id,
                    startTime: { gte: from, lte: to }
                },
                select: { status: true }
            });

            const totalAppts = appointments.length;
            const noShows = appointments.filter(a => a.status === 'NO_SHOW').length;
            const noShowRate = totalAppts > 0 ? (noShows / totalAppts) * 100 : 0;

            return {
                id: loc.id,
                name: loc.name,
                address: loc.address,
                grossSales,
                netSales,
                tips,
                transactionCount: transactions.length,
                appointments: totalAppts,
                noShowRate
            };
        }));

        // Calculate totals
        const summary = {
            totalLocations: locations.length,
            grossSales: locationKPIs.reduce((sum, l) => sum + l.grossSales, 0),
            netSales: locationKPIs.reduce((sum, l) => sum + l.netSales, 0),
            tips: locationKPIs.reduce((sum, l) => sum + l.tips, 0),
            transactionCount: locationKPIs.reduce((sum, l) => sum + l.transactionCount, 0),
            avgTicket: 0
        };
        summary.avgTicket = summary.transactionCount > 0 ? summary.netSales / summary.transactionCount : 0;

        // Generate alerts
        const alerts: { type: string; message: string; locationName: string }[] = [];
        locationKPIs.forEach(loc => {
            if (loc.noShowRate > 15) {
                alerts.push({ type: 'HIGH_NOSHOW', message: `High no-show rate: ${loc.noShowRate.toFixed(1)}%`, locationName: loc.name });
            }
            if (loc.grossSales === 0 && from.toDateString() === new Date().toDateString()) {
                alerts.push({ type: 'ZERO_SALES', message: 'No sales today', locationName: loc.name });
            }
        });

        return NextResponse.json({
            period: { from: from.toISOString(), to: to.toISOString(), label },
            summary,
            locations: locationKPIs,
            alerts
        });
    } catch (error) {
        console.error('[Operator Reports] Error:', error);
        return NextResponse.json({ error: 'Failed to load operator reports' }, { status: 500 });
    }
}
