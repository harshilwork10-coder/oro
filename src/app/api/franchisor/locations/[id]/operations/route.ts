/**
 * Operations Tab API
 * 
 * Returns operational metrics for Location 360:
 * - Shift close status
 * - Z-Report data
 * - Cash drawer variance
 * - Device status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateRange, DateRangePreset } from '@/lib/reporting/kpiDefinitions';

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
        const rangePreset = (searchParams.get('range') || 'TODAY') as DateRangePreset;
        const dateRange = getDateRange(rangePreset);

        // Get location with devices
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: {
                stations: { select: { id: true, name: true, status: true } }
            }
        });

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Get cash drawer sessions
        const drawerSessions = await prisma.cashDrawerSession.findMany({
            where: {
                locationId,
                openedAt: { gte: dateRange.from, lte: dateRange.to }
            },
            include: {
                openedBy: { select: { id: true, name: true } },
                closedBy: { select: { id: true, name: true } }
            },
            orderBy: { openedAt: 'desc' }
        });

        // Calculate drawer metrics
        const openDrawers = drawerSessions.filter(d => !d.closedAt);
        const closedDrawers = drawerSessions.filter(d => d.closedAt);

        let totalVariance = 0;
        closedDrawers.forEach(d => {
            if (d.expectedCash !== null && d.actualCash !== null) {
                totalVariance += Number(d.actualCash) - Number(d.expectedCash);
            }
        });

        // Device status
        const devices = location.stations || [];
        const activeDevices = devices.filter(d => d.status === 'ACTIVE').length;
        const offlineDevices = devices.filter(d => d.status === 'OFFLINE').length;

        // Get time entries for utilization
        const timeEntries = await prisma.timeEntry.findMany({
            where: {
                locationId,
                clockIn: { gte: dateRange.from, lte: dateRange.to }
            },
            include: {
                user: { select: { id: true, name: true } }
            }
        });

        const activeShifts = timeEntries.filter(t => !t.clockOut);
        const completedShifts = timeEntries.filter(t => t.clockOut);

        return NextResponse.json({
            locationId,
            dateRange: {
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
                preset: rangePreset
            },
            cashDrawer: {
                openDrawers: openDrawers.length,
                closedDrawers: closedDrawers.length,
                totalVariance,
                sessions: drawerSessions.map(d => ({
                    id: d.id,
                    openedAt: d.openedAt.toISOString(),
                    closedAt: d.closedAt?.toISOString(),
                    openedBy: d.openedBy?.name,
                    closedBy: d.closedBy?.name,
                    openingBalance: d.openingBalance,
                    expectedCash: d.expectedCash,
                    actualCash: d.actualCash,
                    variance: d.expectedCash && d.actualCash ? Number(d.actualCash) - Number(d.expectedCash) : null
                }))
            },
            devices: {
                total: devices.length,
                active: activeDevices,
                offline: offlineDevices,
                list: devices
            },
            shifts: {
                active: activeShifts.length,
                completed: completedShifts.length,
                current: activeShifts.map(s => ({
                    employee: s.user?.name,
                    clockIn: s.clockIn.toISOString()
                }))
            },
            alerts: [
                ...(openDrawers.length > 0 ? [{ type: 'OPEN_DRAWER', message: `${openDrawers.length} drawer(s) still open` }] : []),
                ...(Math.abs(totalVariance) > 10 ? [{ type: 'CASH_VARIANCE', message: `Cash variance: $${totalVariance.toFixed(2)}` }] : []),
                ...(offlineDevices > 0 ? [{ type: 'DEVICE_OFFLINE', message: `${offlineDevices} device(s) offline` }] : [])
            ]
        });
    } catch (error) {
        console.error('[Operations API] Error:', error);
        return NextResponse.json({ error: 'Failed to load operations data' }, { status: 500 });
    }
}
