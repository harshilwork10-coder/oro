/**
 * Appointments Tab API
 * 
 * Returns appointment metrics for Location 360:
 * - Summary: booked, completed, no-shows, cancelled
 * - Rebook rate
 * - List of appointments
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

        // Verify access
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { id: true, name: true, franchiseId: true }
        });

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Get appointments
        const appointments = await prisma.appointment.findMany({
            where: {
                locationId,
                startTime: { gte: dateRange.from, lte: dateRange.to }
            },
            include: {
                client: { select: { id: true, name: true, phone: true } },
                employee: { select: { id: true, name: true } }
            },
            orderBy: { startTime: 'desc' },
            take: 100
        });

        // Calculate metrics
        const total = appointments.length;
        const completed = appointments.filter(a => a.status === 'COMPLETED').length;
        const noShows = appointments.filter(a => a.status === 'NO_SHOW').length;
        const cancelled = appointments.filter(a => a.status === 'CANCELLED').length;
        const booked = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;

        const noShowRate = total > 0 ? (noShows / total) * 100 : 0;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        return NextResponse.json({
            locationId,
            dateRange: {
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
                preset: rangePreset
            },
            summary: {
                total,
                booked,
                completed,
                noShows,
                cancelled,
                noShowRate: Math.round(noShowRate * 10) / 10,
                completionRate: Math.round(completionRate * 10) / 10
            },
            appointments: appointments.map(a => ({
                id: a.id,
                startTime: a.startTime.toISOString(),
                endTime: a.endTime?.toISOString(),
                status: a.status,
                client: a.client,
                employee: a.employee,
                price: a.price
            }))
        });
    } catch (error) {
        console.error('[Appointments API] Error:', error);
        return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 });
    }
}
