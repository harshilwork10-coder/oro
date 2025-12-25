import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/provider/onboarding/requests/[id]/activate - Mark request as active
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { force = false, actorUserId } = body;

        // Get request with all related data
        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
            include: {
                locations: true,
                devices: true,
                documents: { where: { status: { not: 3 } } }, // Not verified
                shipments: { where: { status: { not: 4 } } }, // Not delivered
            },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Check prerequisites unless force
        if (!force) {
            const issues: string[] = [];

            if (!onboardingRequest.franchiseId) {
                issues.push('Franchise not created');
            }

            const locationsWithoutRealLocation = onboardingRequest.locations.filter(l => !l.locationId);
            if (locationsWithoutRealLocation.length > 0) {
                issues.push(`${locationsWithoutRealLocation.length} location(s) not yet created in system`);
            }

            if (onboardingRequest.devices.length === 0) {
                issues.push('No devices assigned');
            }

            if (onboardingRequest.documents.length > 0) {
                issues.push(`${onboardingRequest.documents.length} document(s) not verified`);
            }

            if (onboardingRequest.shipments.length > 0) {
                issues.push(`${onboardingRequest.shipments.length} shipment(s) not delivered`);
            }

            if (issues.length > 0) {
                return NextResponse.json({
                    error: 'Cannot activate - prerequisites not met',
                    issues,
                }, { status: 400 });
            }
        }

        // Mark as active
        const updated = await prisma.onboardingRequest.update({
            where: { id },
            data: {
                status: 6, // ACTIVE
                activatedAt: new Date(),
                lastStatusAt: new Date(),
            },
        });

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 8, // ACTIVATED
                message: 'Client activated and ready for business',
                actorUserId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error activating request:', error);
        return NextResponse.json({ error: 'Failed to activate request' }, { status: 500 });
    }
}
