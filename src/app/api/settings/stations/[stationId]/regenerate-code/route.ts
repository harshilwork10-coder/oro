import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateStationCode } from '@/lib/codeGenerator';

/**
 * POST /api/settings/stations/[stationId]/regenerate-code
 * 
 * Regenerates the pairing code for a station.
 * Used when hardware is replaced and device needs to be re-paired.
 * 
 * Only PROVIDER role can regenerate codes.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ stationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only PROVIDER can regenerate codes
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden - Provider access required' }, { status: 403 });
        }

        const { stationId } = await params;

        if (!stationId) {
            return NextResponse.json({ error: 'Station ID required' }, { status: 400 });
        }

        // Verify station exists
        const station = await prisma.station.findUnique({
            where: { id: stationId },
            select: {
                id: true,
                name: true,
                pairingStatus: true,
                location: {
                    select: { name: true }
                }
            }
        });

        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 });
        }

        // Generate new 8-character code
        const newCode = await generateStationCode();

        // Update station with new code and reset pairing status
        const updatedStation = await prisma.station.update({
            where: { id: stationId },
            data: {
                pairingCode: newCode,
                pairingStatus: 'PENDING',  // Reset to allow new pairing
                pairedDeviceId: null,       // Clear old device binding
                pairedAt: null,
                pairingCodeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            },
            select: {
                id: true,
                name: true,
                pairingCode: true,
                pairingStatus: true
            }
        });

        console.log(`[regenerate-code] New code for ${station.name} @ ${station.location.name}: ${newCode}`);

        return NextResponse.json({
            success: true,
            station: updatedStation,
            message: `New pairing code generated: ${newCode}`
        });

    } catch (error) {
        console.error('[regenerate-code] Error:', error);
        return NextResponse.json({ error: 'Failed to regenerate code' }, { status: 500 });
    }
}
