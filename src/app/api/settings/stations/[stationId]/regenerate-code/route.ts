import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma'
import { generateStationCode } from '@/lib/codeGenerator';
import { logActivity } from '@/lib/auditLog';

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
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { stationId } = await params;

        if (!stationId) {
            return NextResponse.json({ error: 'Station ID required' }, { status: 400 });
        }

        // Verify station exists and get location for access check
        const station = await prisma.station.findUnique({
            where: { id: stationId },
            select: {
                id: true,
                name: true,
                pairingStatus: true,
                locationId: true,
                location: {
                    select: {
                        name: true,
                        franchiseId: true
                    }
                }
            }
        });

        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 });
        }

        // Access check: PROVIDER can access all, others need franchise match
        let hasAccess = user.role === 'PROVIDER';
        if (!hasAccess && (user.role === 'OWNER' || user.role === 'FRANCHISOR' || user.role === 'FRANCHISEE')) {
            hasAccess = station.location.franchiseId === user.franchiseId;
        }

        if (!hasAccess) {
            console.log(`[regenerate-code] Access denied: user ${user.email} (role: ${user.role}) tried to access station ${stationId}`);
            return NextResponse.json({ error: 'Forbidden - Access denied to this station' }, { status: 403 });
        }

        // Generate new 8-character code
        const newCode = generateStationCode();

        // Update station with new code and reset pairing status
        const updatedStation = await prisma.station.update({
            where: { id: stationId },
            data: {
                pairingCode: newCode,
                pairingStatus: 'UNPAIRED',  // Reset to allow new pairing
                pairedDeviceId: null,       // Clear old device binding
                pairedAt: null,
                pairingCodeUsedAt: null,    // CRITICAL: Clear so new code isn't rejected as "already used"
                isTrusted: false,           // Reset trust — new device must re-pair
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

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'STATION_REGENERATE_CODE',
            entityType: 'Station',
            entityId: stationId,
            metadata: { stationName: station.name, locationName: station.location.name }
        });

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
