import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/provider/onboarding/requests/[id]/create-locations - Create all locations from request
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { actorUserId } = body;

        // Get the onboarding request with locations
        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
            include: { locations: true },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (!onboardingRequest.franchiseId) {
            return NextResponse.json(
                { error: 'Franchise must be created before creating locations' },
                { status: 400 }
            );
        }

        const createdLocationIds: string[] = [];

        // Create each location
        for (const reqLoc of onboardingRequest.locations) {
            if (reqLoc.locationId) {
                // Already created
                createdLocationIds.push(reqLoc.locationId);
                continue;
            }

            // Create location
            const location = await prisma.location.create({
                data: {
                    name: reqLoc.locationName,
                    slug: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    franchiseId: onboardingRequest.franchiseId,
                    // Address would typically go to a separate address model or embedded fields
                },
            });

            // Link location to request location
            await prisma.onboardingRequestLocation.update({
                where: { id: reqLoc.id },
                data: {
                    locationId: location.id,
                    franchiseId: onboardingRequest.franchiseId,
                },
            });

            createdLocationIds.push(location.id);
        }

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 2, // NOTE
                message: `${createdLocationIds.length} location(s) created`,
                actorUserId,
            },
        });

        return NextResponse.json({ locationIds: createdLocationIds }, { status: 201 });
    } catch (error) {
        console.error('Error creating locations:', error);
        return NextResponse.json({ error: 'Failed to create locations' }, { status: 500 });
    }
}
