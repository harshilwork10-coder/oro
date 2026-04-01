/**
 * Rollout Timeline API — /api/franchisor/rollout
 *
 * GET — returns per-franchise rollout stage derived from real schema data:
 *
 *   Stage derivation (in priority order):
 *     BLOCKED      — franchise.approvalStatus === 'REJECTED' or accountStatus suspended/terminated
 *     FIRST_SALE   — at least one Transaction exists for this franchise
 *     TRAINED      — location.provisioningStatus === 'ACTIVE' AND has paired station
 *     PAIRED       — at least one Station with pairingStatus === 'PAIRED'
 *     SHIPPED      — location.provisioningStatus === 'READY_FOR_INSTALL'
 *     PROVISIONING — any location exists with PROVISIONING_PENDING status
 *     APPROVED     — franchise.approvalStatus === 'APPROVED' (no locations yet)
 *     ADDED        — franchise.approvalStatus === 'PENDING'
 *
 * Security: Franchisor-scoped — only franchises under caller's brand.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';

export const STAGE_ORDER = [
    'ADDED',
    'APPROVED',
    'PROVISIONING',
    'SHIPPED',
    'PAIRED',
    'TRAINED',
    'FIRST_SALE',
    'BLOCKED',
] as const;

export type RolloutStage = typeof STAGE_ORDER[number];

const STAGE_RANK: Record<RolloutStage, number> = {
    ADDED: 0, APPROVED: 1, PROVISIONING: 2, SHIPPED: 3,
    PAIRED: 4, TRAINED: 5, FIRST_SALE: 6, BLOCKED: 7,
};

async function getFranchisorId(userId: string): Promise<string | null> {
    const owned = await prisma.franchisor.findFirst({
        where: { ownerId: userId },
        select: { id: true },
    });
    if (owned) return owned.id;

    const mem = await prisma.franchisorMembership.findFirst({
        where: { userId },
        select: { franchisorId: true },
    });
    return mem?.franchisorId ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const franchisorId = await getFranchisorId(authUser.id);
        if (!franchisorId) return NextResponse.json({ error: 'No HQ context' }, { status: 403 });

        // 1. Fetch all franchises (base data only — no nested selects)
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId },
            orderBy: { createdAt: 'desc' },
        });

        if (franchises.length === 0) {
            return NextResponse.json({
                total: 0,
                stuckCount: 0,
                blockedCount: 0,
                stageSummary: Object.fromEntries(STAGE_ORDER.map(s => [s, 0])),
                franchises: [],
            });
        }

        const franchiseIds = franchises.map(f => f.id);

        // 2. Bulk fetch locations for all franchises
        const locations = await prisma.location.findMany({
            where: { franchiseId: { in: franchiseIds } },
            select: { id: true, franchiseId: true, provisioningStatus: true },
        });

        // 3. Bulk fetch stations for all locations
        const locationIds = locations.map(l => l.id);
        const stations = locationIds.length > 0
            ? await prisma.station.findMany({
                where: { locationId: { in: locationIds } },
                select: { id: true, locationId: true, pairingStatus: true, pairedAt: true },
            })
            : [];

        // 4. Bulk fetch first transaction per franchise (aggregate)
        const firstTxPerFranchise = franchiseIds.length > 0
            ? await prisma.transaction.findMany({
                where: { franchiseId: { in: franchiseIds } },
                select: { franchiseId: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
                distinct: ['franchiseId'],
            })
            : [];

        // Build lookup maps
        const locationsByFranchise = new Map<string, typeof locations>();
        for (const loc of locations) {
            const arr = locationsByFranchise.get(loc.franchiseId) ?? [];
            arr.push(loc);
            locationsByFranchise.set(loc.franchiseId, arr);
        }

        const stationsByLocation = new Map<string, typeof stations>();
        for (const stn of stations) {
            const arr = stationsByLocation.get(stn.locationId) ?? [];
            arr.push(stn);
            stationsByLocation.set(stn.locationId, arr);
        }

        const firstTxByFranchise = new Map(firstTxPerFranchise.map(t => [t.franchiseId, t.createdAt]));

        // 5. Derive stage for each franchise
        const rows = franchises.map(franchise => {
            const locs = locationsByFranchise.get(franchise.id) ?? [];
            const allStations = locs.flatMap(l => stationsByLocation.get(l.id) ?? []);
            const hasPairedStation = allStations.some(s => s.pairingStatus === 'PAIRED');
            const hasActiveLocation = locs.some(l => l.provisioningStatus === 'ACTIVE');
            const hasShippedLocation = locs.some(l => l.provisioningStatus === 'READY_FOR_INSTALL');
            const hasProvisioningLocation = locs.some(l => l.provisioningStatus === 'PROVISIONING_PENDING');
            const firstSaleAt = firstTxByFranchise.get(franchise.id) ?? null;
            const hasFirstSale = firstSaleAt !== null;
            const isBlocked =
                franchise.approvalStatus === 'REJECTED' ||
                franchise.accountStatus === 'SUSPENDED' ||
                franchise.accountStatus === 'TERMINATED';

            let stage: RolloutStage;
            if (isBlocked) {
                stage = 'BLOCKED';
            } else if (hasFirstSale) {
                stage = 'FIRST_SALE';
            } else if (hasActiveLocation && hasPairedStation) {
                stage = 'TRAINED';
            } else if (hasPairedStation) {
                stage = 'PAIRED';
            } else if (hasShippedLocation) {
                stage = 'SHIPPED';
            } else if (hasProvisioningLocation || locs.length > 0) {
                stage = 'PROVISIONING';
            } else if (franchise.approvalStatus === 'APPROVED') {
                stage = 'APPROVED';
            } else {
                stage = 'ADDED';
            }

            // Detect blockers
            const blockers: string[] = [];
            if (franchise.approvalStatus === 'REJECTED') blockers.push('Franchise application rejected');
            if (franchise.accountStatus === 'SUSPENDED') blockers.push('Account suspended');
            if (franchise.accountStatus === 'TERMINATED') blockers.push('Account terminated');
            if (stage === 'PROVISIONING' || stage === 'SHIPPED') {
                const unpaired = allStations.filter(s => s.pairingStatus === 'UNPAIRED').length;
                if (allStations.length === 0 && locs.length > 0) {
                    blockers.push('No POS stations configured');
                } else if (unpaired > 0) {
                    blockers.push(`${unpaired} station${unpaired !== 1 ? 's' : ''} not yet paired`);
                }
            }
            if (stage === 'APPROVED' && locs.length === 0) {
                blockers.push('No locations provisioned yet');
            }

            const daysSinceCreated = Math.floor(
                (Date.now() - new Date(franchise.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            const isStuck = daysSinceCreated >= 30 && stage !== 'FIRST_SALE' && stage !== 'BLOCKED';

            return {
                franchiseId: franchise.id,
                franchiseName: franchise.name,
                region: franchise.region ?? null,
                stage,
                stageRank: STAGE_RANK[stage],
                isStuck,
                isBlocked: stage === 'BLOCKED',
                blockers,
                locationCount: locs.length,
                stationCount: allStations.length,
                pairedStations: allStations.filter(s => s.pairingStatus === 'PAIRED').length,
                firstSaleAt: firstSaleAt ? firstSaleAt.toISOString() : null,
                createdAt: franchise.createdAt.toISOString(),
                daysSinceCreated,
            };
        });

        const stageSummary = Object.fromEntries(
            STAGE_ORDER.map(s => [s, rows.filter(r => r.stage === s).length])
        ) as Record<RolloutStage, number>;

        return NextResponse.json({
            total: rows.length,
            stuckCount: rows.filter(r => r.isStuck).length,
            blockedCount: rows.filter(r => r.isBlocked).length,
            stageSummary,
            franchises: rows,
        });
    } catch (error) {
        console.error('[Rollout API]', error);
        return NextResponse.json({ error: 'Failed to load rollout data' }, { status: 500 });
    }
}
