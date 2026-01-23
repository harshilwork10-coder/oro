/**
 * Location 360 API - A-to-Z view for a single location
 * 
 * Returns header + KPIs + alerts (fast, cached 1-5 min)
 * Tabs load on demand via separate endpoints
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

        // Scope check
        const hasAccess = await canAccessLocation(user.id, user.role as UserRole, locationId, user.franchiseId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const rangePreset = (searchParams.get('range') || 'TODAY') as DateRangePreset;
        const customFrom = searchParams.get('from');
        const customTo = searchParams.get('to');

        const dateRange = rangePreset === 'CUSTOM' && customFrom && customTo
            ? { preset: 'CUSTOM' as DateRangePreset, from: new Date(customFrom), to: new Date(customTo), timezone: 'America/Chicago' }
            : getDateRange(rangePreset);

        // Fetch location header
        const location = await prisma.franchiseLocation.findUnique({
            where: { id: locationId },
            select: {
                id: true,
                name: true,
                storeCode: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                status: true,
                phone: true,
                franchisee: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Get stations/devices info
        const stations = await prisma.station.findMany({
            where: { storeId: locationId },
            select: {
                id: true,
                name: true,
                status: true,
                lastSync: true
            }
        });

        // Calculate KPIs for date range
        const [
            transactionStats,
            appointmentStats,
            customerStats
        ] = await Promise.all([
            // Transaction KPIs
            prisma.transaction.aggregate({
                where: {
                    storeId: locationId,
                    createdAt: { gte: dateRange.from, lte: dateRange.to },
                    status: { not: 'VOIDED' }
                },
                _sum: { total: true, tipAmount: true },
                _count: true
            }),

            // Appointment KPIs (if salon)
            prisma.appointment.groupBy({
                by: ['status'],
                where: {
                    locationId,
                    startTime: { gte: dateRange.from, lte: dateRange.to }
                },
                _count: true
            }).catch(() => []),

            // Unique customers
            prisma.transaction.findMany({
                where: {
                    storeId: locationId,
                    createdAt: { gte: dateRange.from, lte: dateRange.to },
                    customerId: { not: null }
                },
                select: { customerId: true },
                distinct: ['customerId']
            })
        ]);

        // Parse appointment stats
        const apptByStatus = Object.fromEntries(
            (appointmentStats as Array<{ status: string; _count: number }>).map(s => [s.status, s._count])
        );
        const totalBooked = Object.values(apptByStatus).reduce((a, b) => a + b, 0);
        const noShows = apptByStatus['NO_SHOW'] || 0;
        const completed = apptByStatus['COMPLETED'] || 0;

        // Calculate refunds/voids for the period
        const refundVoidStats = await prisma.transaction.aggregate({
            where: {
                storeId: locationId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
                type: { in: ['REFUND', 'VOID'] }
            },
            _sum: { total: true },
            _count: true
        });

        // Get any alerts/exceptions
        const alerts: Array<{ type: string; severity: 'INFO' | 'WARNING' | 'CRITICAL'; message: string }> = [];

        // Check for zero sales (if past 10 AM)
        const now = new Date();
        if (rangePreset === 'TODAY' && now.getHours() >= 10 && (transactionStats._count || 0) === 0) {
            alerts.push({ type: 'ZERO_SALES', severity: 'WARNING', message: 'No sales recorded today' });
        }

        // Check for high no-show rate
        if (totalBooked > 0 && (noShows / totalBooked) > 0.15) {
            alerts.push({ type: 'HIGH_NO_SHOW', severity: 'WARNING', message: `No-show rate is ${((noShows / totalBooked) * 100).toFixed(1)}%` });
        }

        // Check for device offline
        const offlineStations = stations.filter(s => {
            if (!s.lastSync) return true;
            const hoursSinceSync = (Date.now() - new Date(s.lastSync).getTime()) / (1000 * 60 * 60);
            return hoursSinceSync > 24;
        });
        if (offlineStations.length > 0) {
            alerts.push({ type: 'DEVICE_OFFLINE', severity: 'CRITICAL', message: `${offlineStations.length} station(s) offline` });
        }

        const grossSales = Number(transactionStats._sum?.total || 0);
        const refunds = Math.abs(Number(refundVoidStats._sum?.total || 0));
        const netSales = grossSales - refunds;

        return NextResponse.json({
            header: {
                ...location,
                franchisee: location.franchisee?.name || 'N/A',
                devices: {
                    paired: stations.length,
                    online: stations.filter(s => s.status === 'ACTIVE').length,
                    lastSync: stations.reduce((latest, s) => {
                        if (!s.lastSync) return latest;
                        return !latest || new Date(s.lastSync) > new Date(latest) ? s.lastSync : latest;
                    }, null as Date | null)
                }
            },
            dateRange: {
                preset: rangePreset,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString()
            },
            kpis: {
                grossSales,
                netSales,
                refunds,
                tips: Number(transactionStats._sum?.tipAmount || 0),
                transactionCount: transactionStats._count || 0,
                avgTicket: transactionStats._count ? netSales / transactionStats._count : 0,
                appointments: {
                    booked: totalBooked,
                    completed,
                    noShows,
                    cancelled: apptByStatus['CANCELLED'] || 0
                },
                noShowRate: totalBooked > 0 ? (noShows / totalBooked) * 100 : 0,
                uniqueCustomers: customerStats.length,
                walkIns: 0 // TODO: Calculate from transactions without appointments
            },
            alerts,
            tabs: ['overview', 'customers', 'bookings', 'sales', 'staff', 'transactions', 'operations']
        });
    } catch (error) {
        console.error('[Location 360] Error:', error);
        return NextResponse.json({ error: 'Failed to load location data' }, { status: 500 });
    }
}
