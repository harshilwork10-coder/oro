'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Generate a unique 8-char pairing code for security (32^8 = ~1 trillion combinations)
function generatePairingCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// POST /api/provider/locations/:id/stations - Create a station with pairing code
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    }

    const { id: locationId } = await params;
    const body = await request.json();
    const { name, type } = body;

    // Verify location exists
    const location = await prisma.location.findUnique({
        where: { id: locationId },
        include: { stations: true }
    });

    if (!location) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Generate station name if not provided
    const stationNumber = location.stations.length + 1;
    const stationName = name || `Station ${stationNumber}`;

    // Generate unique pairing code
    let pairingCode: string;
    let isUnique = false;
    do {
        pairingCode = generatePairingCode();
        const existing = await prisma.station.findFirst({
            where: { pairingCode }
        });
        isUnique = !existing;
    } while (!isUnique);

    // Create the station
    const station = await prisma.station.create({
        data: {
            locationId,
            name: stationName,
            paymentMode: 'CASH_ONLY', // Will be DEDICATED once terminal assigned
            pairingCode,
            isActive: true,
        }
    });

    return NextResponse.json({
        success: true,
        station: {
            id: station.id,
            name: station.name,
            paymentMode: station.paymentMode,
            pairingCode: station.pairingCode,
            isActive: station.isActive,
            createdAt: station.createdAt
        },
        message: `Station created. Pairing code: ${pairingCode}`
    });
}

// GET /api/provider/locations/:id/stations - List stations for a location
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    }

    const { id: locationId } = await params;

    const stations = await prisma.station.findMany({
        where: { locationId },
        orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ data: stations });
}
