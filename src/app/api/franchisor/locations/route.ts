/**
 * Franchisor Locations API
 * 
 * SCOPE ENFORCEMENT:
 * - FRANCHISOR role: User owns a Franchisor (brand) → sees all locations under their franchises
 * - OWNER role: User has franchiseId → sees locations for that franchise only
 * - PROVIDER role: Should NOT access this endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper to get franchisor for current user
async function getFranchisorForUser(userId: string) {
    return prisma.franchisor.findFirst({
        where: { ownerId: userId },
        include: { franchises: { select: { id: true } } }
    });
}

// GET /api/franchisor/locations - List locations for this HQ
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role?: string };

    // PROVIDER should use /provider/... endpoints
    if (user.role === 'PROVIDER') {
        return NextResponse.json({ error: 'Use /api/provider endpoints for platform admin' }, { status: 403 });
    }

    // Get scope based on role
    let franchiseIds: string[] = [];

    if (user.role === 'FRANCHISOR') {
        // FRANCHISOR owns a brand → get all franchises under it
        const franchisor = await getFranchisorForUser(session.user.id);
        if (!franchisor) {
            return NextResponse.json({ data: [], message: 'No brand found for this user' });
        }
        franchiseIds = franchisor.franchises.map(f => f.id);
    } else {
        // OWNER or other roles → use direct franchiseId
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { franchiseId: true }
        });
        if (dbUser?.franchiseId) {
            franchiseIds = [dbUser.franchiseId];
        }
    }

    if (franchiseIds.length === 0) {
        return NextResponse.json({ data: [] });
    }

    // Get locations for these franchises
    const locations = await prisma.location.findMany({
        where: { franchiseId: { in: franchiseIds } },
        include: {
            franchise: { select: { id: true, name: true } },
            _count: { select: { stations: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    const data = locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        franchiseeId: loc.franchise?.id,
        franchiseeName: loc.franchise?.name,
        provisioningStatus: loc.provisioningStatus,
        stationCount: loc._count.stations,
        createdAt: loc.createdAt
    }));

    return NextResponse.json({ data });
}

// POST /api/franchisor/locations - HQ creates a new location
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role?: string };

    // Only FRANCHISOR can create locations
    if (user.role !== 'FRANCHISOR') {
        return NextResponse.json({ error: 'Only brand owners can create locations' }, { status: 403 });
    }

    const franchisor = await getFranchisorForUser(session.user.id);
    if (!franchisor) {
        return NextResponse.json({ error: 'No brand found for this user' }, { status: 404 });
    }

    const body = await request.json();
    const { franchiseeId, name, address } = body;

    if (!franchiseeId) {
        return NextResponse.json({ error: 'Franchisee LLC is required' }, { status: 400 });
    }
    if (!name) {
        return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    // Verify franchisee belongs to this franchisor
    const franchise = await prisma.franchise.findFirst({
        where: { id: franchiseeId, franchisorId: franchisor.id }
    });

    if (!franchise) {
        return NextResponse.json({ error: 'Franchisee not found or not authorized' }, { status: 404 });
    }

    // Create slug from name
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingCount = await prisma.location.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;

    // Create the location
    const location = await prisma.location.create({
        data: {
            name,
            slug,
            address: address || null,
            franchiseId: franchise.id,
            franchisorId: franchisor.id,
            franchiseeBusinessId: franchise.id,
            provisioningStatus: 'PROVISIONING_PENDING',
        }
    });

    // Create provisioning task
    await prisma.locationProvisioningTask.create({
        data: {
            locationId: location.id,
            franchisorId: franchisor.id,
            franchiseeBusinessId: franchise.id,
            requestedByUserId: session.user.id,
            notes: body.notes || null,
            status: 'OPEN'
        }
    });

    return NextResponse.json({
        success: true,
        location: {
            id: location.id,
            name: location.name,
            address: location.address,
            franchiseeId: franchise.id,
            franchiseeName: franchise.name,
            provisioningStatus: location.provisioningStatus,
            stationCount: 0,
            createdAt: location.createdAt
        },
        message: 'Location created. Provider will set up devices.'
    });
}
