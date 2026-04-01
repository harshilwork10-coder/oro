/**
 * Catalog Compliance API — /api/franchisor/catalog/compliance
 *
 * GET — returns a per-franchise compliance report:
 *   - How many HQ catalog services are active at each franchise
 *   - How many are local-only (not in HQ catalog)
 *   - How many have local price overrides vs HQ price
 *   - Overall compliance score (%)
 *
 * Drift signals:
 *   - LOCAL_ONLY_SERVICE: service exists but has no globalServiceId → not from HQ
 *   - PRICE_DRIFT: service has globalServiceId but price differs from GlobalService.basePrice
 *   - MISSING: HQ service not found in this franchise at all
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';

async function getFranchisorData(userId: string) {
    const owned = await prisma.franchisor.findFirst({
        where: { ownerId: userId },
        select: { id: true }
    });
    if (owned) return owned.id;

    const mem = await prisma.franchisorMembership.findFirst({
        where: { userId },
        select: { franchisorId: true }
    });
    return mem?.franchisorId ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const franchisorId = await getFranchisorData(authUser.id);
        if (!franchisorId) return NextResponse.json({ error: 'No HQ context' }, { status: 403 });

        // 1. Get the HQ's GlobalService catalog
        const globalServices = await prisma.globalService.findMany({
            where: { franchisorId, isActive: true, isArchived: false },
            select: { id: true, name: true, basePrice: true, duration: true }
        });
        const globalServiceIds = new Set(globalServices.map(g => g.id));
        const globalServiceMap = new Map(globalServices.map(g => [g.id, g]));

        // 2. Get all franchises under this franchisor
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId },
            select: {
                id: true,
                name: true,
                region: true,
                services: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        globalServiceId: true
                    }
                }
            }
        });

        // 3. Calculate per-franchise compliance
        const franchiseReports = franchises.map(franchise => {
            const services = franchise.services;
            const totalHQServices = globalServices.length;

            // Services linked to HQ catalog
            const linkedServices = services.filter(s => s.globalServiceId && globalServiceIds.has(s.globalServiceId));
            // Local-only (not in HQ catalog)
            const localOnlyServices = services.filter(s => !s.globalServiceId);
            // HQ services NOT present at this franchise
            const presentGlobalIds = new Set(linkedServices.map(s => s.globalServiceId!));
            const missingServices = globalServices.filter(g => !presentGlobalIds.has(g.id));

            // Price drift: linked services with price ≠ HQ basePrice
            const priceDrifts = linkedServices.filter(s => {
                const global = globalServiceMap.get(s.globalServiceId!);
                if (!global) return false;
                return Math.abs(Number(s.price) - Number(global.basePrice)) > 0.01;
            });

            // Compliance score: % of HQ services present with no price drift
            const compliantCount = linkedServices.length - priceDrifts.length;
            const score = totalHQServices > 0
                ? Math.round((compliantCount / totalHQServices) * 100)
                : 100;

            // Status
            let status: 'COMPLIANT' | 'DRIFTING' | 'CRITICAL';
            if (score >= 90) status = 'COMPLIANT';
            else if (score >= 60) status = 'DRIFTING';
            else status = 'CRITICAL';

            return {
                franchiseId: franchise.id,
                franchiseName: franchise.name,
                region: franchise.region,
                totalServices: services.length,
                linkedToHQ: linkedServices.length,
                localOnly: localOnlyServices.length,
                missing: missingServices.length,
                priceDrifts: priceDrifts.length,
                complianceScore: score,
                status,
                // Drill-down details
                localOnlyNames: localOnlyServices.slice(0, 5).map(s => s.name),
                missingNames: missingServices.slice(0, 5).map(s => s.name),
                priceDriftDetails: priceDrifts.slice(0, 5).map(s => ({
                    serviceName: s.name,
                    localPrice: Number(s.price),
                    hqPrice: Number(globalServiceMap.get(s.globalServiceId!)?.basePrice || 0),
                })),
            };
        });

        // Sort: CRITICAL first, then DRIFTING, then COMPLIANT, then by score asc
        franchiseReports.sort((a, b) => {
            const order = { CRITICAL: 0, DRIFTING: 1, COMPLIANT: 2 };
            if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
            return a.complianceScore - b.complianceScore;
        });

        // Summary
        const criticalCount = franchiseReports.filter(r => r.status === 'CRITICAL').length;
        const driftingCount = franchiseReports.filter(r => r.status === 'DRIFTING').length;
        const compliantCount = franchiseReports.filter(r => r.status === 'COMPLIANT').length;
        const avgScore = franchiseReports.length
            ? Math.round(franchiseReports.reduce((s, r) => s + r.complianceScore, 0) / franchiseReports.length)
            : 100;

        return NextResponse.json({
            hqCatalogSize: globalServices.length,
            franchiseeCount: franchises.length,
            summary: {
                avgComplianceScore: avgScore,
                criticalCount,
                driftingCount,
                compliantCount,
            },
            franchisees: franchiseReports,
        });
    } catch (error) {
        console.error('[Catalog Compliance]', error);
        return NextResponse.json({ error: 'Failed to load compliance data' }, { status: 500 });
    }
}
