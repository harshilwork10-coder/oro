/**
 * Problem Store Board API
 * GET /api/franchisor/portfolio/exceptions
 *
 * Aggregates problem stores across 4 exception categories:
 *   1. NO_DEVICES      — Active locations with zero paired station devices
 *   2. NO_ACTIVITY     — Active locations with no transactions in the last 48h
 *   3. HIGH_NOSHOW     — Locations where MTD no-show rate > 20% (min 5 appointments)
 *   4. STUCK_PROVISION — Locations not yet ACTIVE after 7 days
 *
 * Returns: { exceptions: ExceptionItem[], summary: { critical, warning, total } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser || authUser.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: authUser.id },
            select: { id: true }
        });
        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 });
        }

        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Pull all locations under this franchisor brand via their franchises
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId: franchisor.id },
            select: {
                id: true,
                name: true,
                region: true,
                users: {
                    where: { role: { in: ['FRANCHISEE', 'OWNER'] } },
                    select: { name: true, email: true },
                    take: 1
                },
                locations: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        provisioningStatus: true,
                        createdAt: true,
                        settings: {
                            select: {
                                storeCity: true,
                                storeState: true,
                            }
                        },
                        stations: {
                            where: { pairingStatus: 'PAIRED' },
                            select: { id: true },
                        },
                        transactions: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: { createdAt: true },
                        },
                        appointments: {
                            where: { createdAt: { gte: monthStart } },
                            select: { status: true },
                        },
                    }
                }
            }
        });

        type ExceptionSeverity = 'CRITICAL' | 'WARNING';
        type ExceptionType = 'NO_DEVICES' | 'NO_ACTIVITY' | 'HIGH_NOSHOW' | 'STUCK_PROVISION';

        const exceptions: Array<{
            id: string;
            locationId: string;
            locationName: string;
            locationCity: string;
            locationState: string;
            franchiseName: string;
            franchiseeContact: string;
            region: string | null;
            type: ExceptionType;
            severity: ExceptionSeverity;
            message: string;
            daysOpen: number;
            actionUrl: string;
        }> = [];

        for (const franchise of franchises) {
            const ownerName = franchise.users[0]?.name || franchise.name;

            for (const location of franchise.locations) {
                const isActive = location.provisioningStatus === 'ACTIVE';
                const daysOld = Math.floor((now.getTime() - new Date(location.createdAt).getTime()) / (1000 * 60 * 60 * 24));

                const base = {
                    locationId: location.id,
                    locationName: location.name,
                    locationCity: location.settings?.storeCity || '',
                    locationState: location.settings?.storeState || '',
                    franchiseName: franchise.name,
                    franchiseeContact: ownerName,
                    region: franchise.region,
                    actionUrl: `/franchisor/locations/${location.id}`,
                };

                // CATEGORY 1: No paired devices (active location, older than 3 days)
                if (isActive && location.stations.length === 0 && daysOld > 3) {
                    exceptions.push({
                        id: `${location.id}-offline`,
                        ...base,
                        type: 'NO_DEVICES',
                        severity: 'CRITICAL',
                        message: 'No paired POS devices — location appears offline',
                        daysOpen: daysOld,
                    });
                }

                // CATEGORY 2: No transactions in 48h (active, has devices)
                if (isActive && location.stations.length > 0) {
                    const lastTx = location.transactions[0]?.createdAt;
                    const daysInactive = lastTx
                        ? Math.floor((now.getTime() - new Date(lastTx).getTime()) / (1000 * 60 * 60 * 24))
                        : daysOld;

                    if (!lastTx || new Date(lastTx) < fortyEightHoursAgo) {
                        exceptions.push({
                            id: `${location.id}-no-activity`,
                            ...base,
                            type: 'NO_ACTIVITY',
                            severity: daysInactive > 7 ? 'CRITICAL' : 'WARNING',
                            message: lastTx
                                ? `No transactions in ${daysInactive} days`
                                : 'No transactions recorded since launch',
                            daysOpen: daysInactive,
                        });
                    }
                }

                // CATEGORY 3: High no-show rate MTD
                const appts = location.appointments;
                const noShows = appts.filter((a: { status: string }) => a.status === 'NO_SHOW').length;
                if (appts.length >= 5) {
                    const rate = (noShows / appts.length) * 100;
                    if (rate > 20) {
                        exceptions.push({
                            id: `${location.id}-noshow`,
                            ...base,
                            type: 'HIGH_NOSHOW',
                            severity: rate > 35 ? 'CRITICAL' : 'WARNING',
                            message: `${rate.toFixed(0)}% no-show rate MTD (${noShows}/${appts.length} appts)`,
                            daysOpen: 0,
                        });
                    }
                }

                // CATEGORY 4: Stuck in provisioning > 7 days
                if (!isActive && daysOld > 7) {
                    exceptions.push({
                        id: `${location.id}-stuck`,
                        ...base,
                        type: 'STUCK_PROVISION',
                        severity: daysOld > 14 ? 'CRITICAL' : 'WARNING',
                        message: `Stuck in ${location.provisioningStatus} for ${daysOld} days`,
                        daysOpen: daysOld,
                    });
                }
            }
        }

        // Sort: CRITICAL first, then by daysOpen descending
        exceptions.sort((a, b) => {
            if (a.severity !== b.severity) return a.severity === 'CRITICAL' ? -1 : 1;
            return b.daysOpen - a.daysOpen;
        });

        const critical = exceptions.filter(e => e.severity === 'CRITICAL').length;
        const warning = exceptions.filter(e => e.severity === 'WARNING').length;

        return NextResponse.json({
            exceptions,
            summary: { critical, warning, total: exceptions.length }
        });
    } catch (error) {
        console.error('[Franchisor Exceptions] Error:', error);
        return NextResponse.json({ error: 'Failed to load exceptions' }, { status: 500 });
    }
}
