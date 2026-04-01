/**
 * Franchisor Brand Settings API
 *
 * GET  — Fetch current brand settings (policies + brand defaults + lock controls)
 * PUT  — Save brand settings to Franchisor model
 *
 * Persists to:
 *   - Franchisor.brandSettings (JSON string) for policies + misc defaults
 *   - Franchisor.name for brand name
 *   - Franchisor.brandColorPrimary for brand color
 *   - Franchisor.lockPricing / lockServices / lockProducts / lockCommission (direct DB fields)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';

interface BrandSettingsPayload {
    liabilityWaiver?: string;
    cancellationPolicy?: string;
    noShowPolicy?: string;
    depositRequired?: boolean;
    depositPercent?: number;
    brandName?: string;
    brandColor?: string;
    defaultCurrency?: string;
    timezone?: string;
    // Brand Lock Controls — stored as direct DB fields on Franchisor
    lockPricing?: boolean;
    lockServices?: boolean;
    lockProducts?: boolean;
    lockCommission?: boolean;
}

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser || authUser.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: authUser.id },
            select: {
                id: true,
                name: true,
                brandColorPrimary: true,
                brandSettings: true,
                lockPricing: true,
                lockServices: true,
                lockProducts: true,
                lockCommission: true,
            }
        });

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 });
        }

        // Parse stored brandSettings JSON (policies + misc)
        let policies: Record<string, unknown> = {};
        if (franchisor.brandSettings) {
            try {
                policies = JSON.parse(franchisor.brandSettings);
            } catch {
                policies = {};
            }
        }

        return NextResponse.json({
            brandName: franchisor.name || '',
            brandColor: franchisor.brandColorPrimary || '#f59e0b',
            defaultCurrency: (policies.defaultCurrency as string) || 'USD',
            timezone: (policies.timezone as string) || 'America/Chicago',
            liabilityWaiver: (policies.liabilityWaiver as string) || '',
            cancellationPolicy: (policies.cancellationPolicy as string) || '',
            noShowPolicy: (policies.noShowPolicy as string) || '',
            depositRequired: (policies.depositRequired as boolean) || false,
            depositPercent: (policies.depositPercent as number) || 25,
            // Lock controls — read from direct DB fields
            lockPricing: franchisor.lockPricing ?? false,
            lockServices: franchisor.lockServices ?? false,
            lockProducts: franchisor.lockProducts ?? false,
            lockCommission: franchisor.lockCommission ?? false,
        });
    } catch (error) {
        console.error('[Franchisor Settings GET] Error:', error);
        return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser || authUser.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: BrandSettingsPayload = await req.json();

        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: authUser.id },
            select: { id: true, brandSettings: true }
        });

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 });
        }

        // Merge with existing brandSettings JSON (for policy fields)
        let existing: Record<string, unknown> = {};
        if (franchisor.brandSettings) {
            try { existing = JSON.parse(franchisor.brandSettings); } catch { existing = {}; }
        }

        const updatedPolicies = {
            ...existing,
            ...(body.liabilityWaiver !== undefined && { liabilityWaiver: body.liabilityWaiver }),
            ...(body.cancellationPolicy !== undefined && { cancellationPolicy: body.cancellationPolicy }),
            ...(body.noShowPolicy !== undefined && { noShowPolicy: body.noShowPolicy }),
            ...(body.depositRequired !== undefined && { depositRequired: body.depositRequired }),
            ...(body.depositPercent !== undefined && { depositPercent: body.depositPercent }),
            ...(body.defaultCurrency !== undefined && { defaultCurrency: body.defaultCurrency }),
            ...(body.timezone !== undefined && { timezone: body.timezone }),
        };

        await prisma.franchisor.update({
            where: { id: franchisor.id },
            data: {
                brandSettings: JSON.stringify(updatedPolicies),
                // Scalar fields updated directly
                ...(body.brandName !== undefined && { name: body.brandName }),
                ...(body.brandColor !== undefined && { brandColorPrimary: body.brandColor }),
                // Brand lock controls — stored as direct boolean fields
                ...(body.lockPricing !== undefined && { lockPricing: body.lockPricing }),
                ...(body.lockServices !== undefined && { lockServices: body.lockServices }),
                ...(body.lockProducts !== undefined && { lockProducts: body.lockProducts }),
                ...(body.lockCommission !== undefined && { lockCommission: body.lockCommission }),
            }
        });

        return NextResponse.json({ success: true, message: 'Brand settings saved successfully.' });
    } catch (error) {
        console.error('[Franchisor Settings PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
